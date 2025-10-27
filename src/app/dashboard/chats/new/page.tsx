import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewChatForm from './NewChatForm'

interface Props {
  searchParams: Promise<{ character?: string }>
}

export default async function NewChatPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 캐릭터 목록
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('name')

  // API 키 목록
  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('provider')

  if (!characters || characters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            먼저 캐릭터를 생성해주세요
          </p>
          <Link
            href="/dashboard/characters/new"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            캐릭터 만들기
          </Link>
        </div>
      </div>
    )
  }

  if (!apiKeys || apiKeys.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            먼저 API 키를 등록해주세요
          </p>
          <Link
            href="/dashboard/api-keys"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            API 키 등록하기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/chats"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              ← 채팅 목록
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              새 채팅 시작
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NewChatForm
          characters={characters}
          apiKeys={apiKeys}
          preselectedCharacterId={params.character}
        />
      </main>
    </div>
  )
}
