import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ChatsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 채팅 목록 가져오기 (캐릭터 정보 포함)
  const { data: chats } = await supabase
    .from('chats')
    .select(`
      *,
      characters (
        id,
        name,
        avatar_url
      )
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  // 활성 API 키 확인
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const hasApiKeys = apiKeys && apiKeys.length > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← 대시보드
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              채팅 목록
            </h1>
          </div>
          {hasApiKeys && (
            <Link
              href="/dashboard/chats/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              + 새 채팅
            </Link>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* API 키 없을 때 안내 */}
        {!hasApiKeys && (
          <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
              ⚠️ API 키가 필요합니다
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
              채팅을 시작하려면 먼저 API 키를 등록해야 합니다.
            </p>
            <Link
              href="/dashboard/api-keys"
              className="inline-block px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
            >
              API 키 등록하기
            </Link>
          </div>
        )}

        {/* 채팅 목록 */}
        {chats && chats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chats.map((chat: any) => (
              <Link
                key={chat.id}
                href={`/dashboard/chats/${chat.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {chat.title || '새 채팅'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {chat.characters?.name}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  마지막 업데이트:{' '}
                  {new Date(chat.updated_at).toLocaleDateString('ko-KR')}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              아직 채팅 기록이 없습니다
            </p>
            {hasApiKeys && (
              <Link
                href="/dashboard/chats/new"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                첫 채팅 시작하기
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
