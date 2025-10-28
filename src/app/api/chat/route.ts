import { createClient } from '@/lib/supabase/server'
import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

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

    const sanitizedMessages = Array.isArray(messages)
      ? messages
          .filter(
            (message): message is { role: string; content: string } =>
              typeof message === 'object' &&
              message !== null &&
              typeof message.role === 'string' &&
              typeof message.content === 'string'
          )
          .map((message) => ({
            role: message.role as 'user' | 'assistant' | 'system',
            content: message.content,
          }))
          .filter((message) => message.role === 'user' || message.role === 'assistant')
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

    const maxContextMessages = chat.max_context_messages || 20

    // Provider에 따라 모델 선택
    let model
    const provider = apiKeyData.provider
    const modelName = apiKeyData.model_preference || getDefaultModel(provider)

    switch (provider) {
      case 'google': {
        const googleProvider = createGoogleGenerativeAI({ apiKey: decryptedApiKey })
        model = googleProvider(modelName)
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

    // 시스템 프롬프트 추가
    const systemMessage = {
      role: 'system' as const,
      content: character.system_prompt,
    }

    // FIFO 컨텍스트 윈도우: 최근 N개 메시지만 사용
    const recentMessages = sanitizedMessages.slice(-maxContextMessages)

    // 스트리밍 응답 생성
    const result = await streamText({
      model,
      messages: [systemMessage, ...recentMessages],
      async onFinish({ text, usage }) {
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

          // AI 응답 저장
          await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: text,
            model_used: modelName,
            prompt_tokens: usage?.promptTokens,
            completion_tokens: usage?.completionTokens,
          })

          // API 키 마지막 사용 시간 업데이트
          await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', apiKeyId)
        } catch (error) {
          console.error('Error saving messages:', error)
        }
      },
    })

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
