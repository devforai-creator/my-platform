import { createClient } from '@/lib/supabase/server'
import { streamText, type FinishReason, type LanguageModel } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import {
  buildContext,
  updateSummaries,
  type SanitizedMessage,
} from '@/lib/chat-summaries'

export const runtime = 'edge'
export const maxDuration = 60 // 60초 타임아웃

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return new Response('Invalid request body', { status: 400 })
    }

    const { messages, chatId, apiKeyId } = body as {
      messages?: Array<{ role?: string; content?: unknown }>
      chatId?: unknown
      apiKeyId?: unknown
    }

    if (typeof chatId !== 'string' || !chatId) {
      return new Response('Invalid chatId', { status: 400 })
    }

    if (typeof apiKeyId !== 'string' || !apiKeyId) {
      return new Response('Invalid apiKeyId', { status: 400 })
    }

    const sanitizedMessages: SanitizedMessage[] = Array.isArray(messages)
      ? messages
          .filter(
            (message): message is { role: string; content: string } =>
              typeof message === 'object' &&
              message !== null &&
              typeof message.role === 'string' &&
              typeof message.content === 'string'
          )
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map((message) => ({
            role: message.role as 'user' | 'assistant',
            content: message.content,
          }))
      : []

    if (sanitizedMessages.length === 0) {
      return new Response('Messages array required', { status: 400 })
    }

    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]

    if (lastMessage.role !== 'user' || !lastMessage.content.trim()) {
      return new Response('Last message must be a non-empty user message', { status: 400 })
    }

    const supabase = await createClient()

    // 사용자 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // API 키 정보 가져오기
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', apiKeyId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeyData) {
      return new Response('API key not found or inactive', { status: 404 })
    }

    // Vault에서 실제 API 키 복호화
    const { data: secretData } = await supabase.rpc('get_decrypted_secret', {
      secret_name: apiKeyData.vault_secret_name,
    })

    if (!secretData) {
      return new Response('Failed to decrypt API key', { status: 500 })
    }

    const decryptedApiKey = secretData as string

    // 채팅 정보 가져오기 (소유권 확인)
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('id, character_id, max_context_messages')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (chatError || !chat) {
      return new Response('Chat not found', { status: 404 })
    }

    // 캐릭터 정보 가져오기
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('id, system_prompt')
      .eq('id', chat.character_id)
      .single()

    if (characterError || !character) {
      return new Response('Character not found', { status: 404 })
    }

    // Provider에 따라 모델 선택
    let model: LanguageModel
    const provider = apiKeyData.provider
    const modelName = apiKeyData.model_preference || getDefaultModel(provider)

    switch (provider) {
      case 'google': {
        const googleProvider = createGoogleGenerativeAI({ apiKey: decryptedApiKey })
        const safetySettings: Array<{
          category:
            | 'HARM_CATEGORY_HARASSMENT'
            | 'HARM_CATEGORY_HATE_SPEECH'
            | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
            | 'HARM_CATEGORY_DANGEROUS_CONTENT'
          threshold:
            | 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
            | 'BLOCK_LOW_AND_ABOVE'
            | 'BLOCK_MEDIUM_AND_ABOVE'
            | 'BLOCK_ONLY_HIGH'
            | 'BLOCK_NONE'
        }> = [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ]

        model = googleProvider(modelName, { safetySettings })
        break
      }
      case 'openai': {
        const openaiProvider = createOpenAI({ apiKey: decryptedApiKey })
        model = openaiProvider(modelName)
        break
      }
      case 'anthropic': {
        const anthropicProvider = createAnthropic({ apiKey: decryptedApiKey })
        model = anthropicProvider(modelName)
        break
      }
      default:
        return new Response('Unsupported provider', { status: 400 })
    }

    const { systemPrompt, recentMessages } = await buildContext({
      supabase,
      chatId: chat.id,
      sanitizedMessages,
      baseSystemPrompt: character.system_prompt,
    })

    let contentFilterError: string | null = null

    // 스트리밍 응답 생성
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: recentMessages,
      async onFinish({
        text,
        usage,
        finishReason,
        experimental_providerMetadata,
      }) {
        // 응답이 완료되면 메시지 저장
        try {
          // 사용자 메시지 저장
          const userMessage = sanitizedMessages[sanitizedMessages.length - 1]

          if (userMessage.role !== 'user') {
            return
          }

          await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'user',
            content: userMessage.content,
          })

          const contentFilterInfo = evaluateContentFilter({
            provider,
            finishReason,
            metadata: experimental_providerMetadata,
          })

          const nowIsoString = new Date().toISOString()

          const isEmptyAssistantReply =
            typeof text !== 'string' || text.trim().length === 0

          if (provider === 'google' && (finishReason !== 'stop' || isEmptyAssistantReply)) {
            console.warn('[Chat API] Google finish details', {
              finishReason,
              textLength: typeof text === 'string' ? text.length : null,
              metadata: experimental_providerMetadata,
            })
          }

          const shouldTreatAsFiltered =
            contentFilterInfo.blocked || (provider === 'google' && isEmptyAssistantReply)

          if (shouldTreatAsFiltered) {
            const errorMessage = buildContentFilterMessage(
              provider,
              contentFilterInfo.categories
            )
            contentFilterError = errorMessage

            await supabase.from('messages').insert({
              chat_id: chatId,
              role: 'system',
              content: errorMessage,
              error_code:
                provider === 'google' ? 'GOOGLE_CONTENT_FILTER' : 'CONTENT_FILTER',
            })

            await supabase
              .from('api_keys')
              .update({ last_used_at: nowIsoString })
              .eq('id', apiKeyId)

            return
          }

          // AI 응답 저장
          await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: text,
            model_used: modelName,
            prompt_tokens: usage?.promptTokens ?? null,
            completion_tokens: usage?.completionTokens ?? null,
          })

          // API 키 마지막 사용 시간 업데이트
          await supabase
            .from('api_keys')
            .update({ last_used_at: nowIsoString })
            .eq('id', apiKeyId)

          await updateSummaries({ supabase, chatId, model })
        } catch (error) {
          console.error('Error saving messages:', error)
        }
      },
    })

    if (contentFilterError) {
      return new Response(JSON.stringify({ error: contentFilterError }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return result.toAIStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'google':
      return 'gemini-2.5-flash'
    case 'openai':
      return 'gpt-4.1'
    case 'anthropic':
      return 'claude-haiku-4-5'
    default:
      return 'gemini-2.5-flash'
  }
}

function evaluateContentFilter({
  provider,
  finishReason,
  metadata,
}: {
  provider: string
  finishReason: FinishReason | undefined
  metadata: unknown
}): { blocked: boolean; categories: string[] } {
  const normalizedFinish = typeof finishReason === 'string' ? finishReason : 'unknown'
  let blocked = normalizedFinish === 'content-filter'
  let categories: string[] = []

  if (provider !== 'google') {
    return { blocked, categories }
  }

  const googleMetadata =
    metadata && typeof metadata === 'object' && metadata !== null && 'google' in metadata
      ? (metadata as { google?: Record<string, unknown> }).google ?? {}
      : {}

  const finishReasonHint =
    typeof googleMetadata?.finishReason === 'string'
      ? googleMetadata.finishReason.toLowerCase()
      : null

  const safetyRatingsRaw =
    googleMetadata && 'safetyRatings' in googleMetadata
      ? (googleMetadata.safetyRatings as unknown)
      : undefined

  const safetyRatings = Array.isArray(safetyRatingsRaw) ? safetyRatingsRaw : []

  const blockedRatings = safetyRatings
    .map((entry) => (typeof entry === 'object' && entry !== null ? entry : null))
    .filter(
      (entry): entry is { category?: unknown; blocked?: unknown } =>
        entry !== null && 'blocked' in entry
    )
    .filter((entry) => Boolean(entry.blocked))

  categories = blockedRatings
    .map((entry) => entry.category)
    .filter((category): category is string => typeof category === 'string')

  if (blockedRatings.length > 0) {
    blocked = true
  }

  if (
    finishReasonHint === 'safety' ||
    finishReasonHint === 'blocked' ||
    normalizedFinish === 'other'
  ) {
    blocked = true
  }

  return { blocked, categories }
}

function buildContentFilterMessage(provider: string, categories: string[]): string {
  const baseMessage =
    provider === 'google'
      ? 'Google Gemini 검열에 의해 차단되었습니다. 프롬프트를 완화하거나 다른 API 키/모델을 사용해주세요.'
      : '모델의 안전 필터에 의해 응답이 차단되었습니다. 프롬프트를 조정하거나 다른 모델을 사용해주세요.'

  if (categories.length === 0) {
    return baseMessage
  }

  const formattedCategories = categories
    .map((category) =>
      category
        .replace(/^HARM_CATEGORY_/, '')
        .replace(/_/g, ' ')
        .toLowerCase()
    )
    .join(', ')

  return `${baseMessage}\n감지된 카테고리: ${formattedCategories}`
}
