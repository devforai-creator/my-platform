import { createClient } from '@/lib/supabase/server'
import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

export const runtime = 'edge'
export const maxDuration = 60 // 60초 타임아웃

export async function POST(req: Request) {
  try {
    const { messages, chatId, characterId, provider, apiKeyId } = await req.json()

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

    // 캐릭터 정보 가져오기
    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (!character) {
      return new Response('Character not found', { status: 404 })
    }

    // Provider에 따라 모델 선택
    let model
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

    // 스트리밍 응답 생성
    const result = await streamText({
      model,
      messages: [systemMessage, ...messages],
      async onFinish({ text, usage }) {
        // 응답이 완료되면 메시지 저장
        try {
          // 사용자 메시지 저장
          const userMessage = messages[messages.length - 1]
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
