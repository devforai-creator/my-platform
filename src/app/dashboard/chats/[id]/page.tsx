import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ChatInterface from './ChatInterface'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ apiKey?: string }>
}

export default async function ChatPage({ params, searchParams }: Props) {
  const { id } = await params
  const search = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 채팅 정보 가져오기 (캐릭터 포함)
  const { data: chat } = await supabase
    .from('chats')
    .select(`
      *,
      characters (
        id,
        name,
        system_prompt,
        greeting_message
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!chat) {
    redirect('/dashboard/chats')
  }

  // 메시지 목록 가져오기
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', id)
    .order('created_at', { ascending: true })

  // 토큰 사용량 계산
  const totalTokens = messages?.reduce((sum, msg) => {
    return sum + (msg.prompt_tokens || 0) + (msg.completion_tokens || 0)
  }, 0) || 0

  const totalPromptTokens = messages?.reduce((sum, msg) => {
    return sum + (msg.prompt_tokens || 0)
  }, 0) || 0

  const totalCompletionTokens = messages?.reduce((sum, msg) => {
    return sum + (msg.completion_tokens || 0)
  }, 0) || 0

  // API 키 목록 가져오기
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, key_name, provider, model_preference')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const preselectedApiKeyId = search.apiKey || apiKeys?.[0]?.id

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/chats"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ← 채팅 목록
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {chat.characters?.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {chat.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 채팅 인터페이스 */}
      <ChatInterface
        chatId={chat.id}
        initialMessages={messages || []}
        apiKeys={apiKeys || []}
        preselectedApiKeyId={preselectedApiKeyId}
        initialTokenStats={{
          total: totalTokens,
          prompt: totalPromptTokens,
          completion: totalCompletionTokens,
        }}
      />
    </div>
  )
}
