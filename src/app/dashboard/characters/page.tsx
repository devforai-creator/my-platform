import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CharacterCard from './CharacterCard'

export default async function CharactersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 캐릭터 목록 가져오기
  const { data: characters, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching characters:', error)
  }

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
              캐릭터 관리
            </h1>
          </div>
          <Link
            href="/dashboard/characters/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            + 새 캐릭터
          </Link>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 안내 메시지 */}
        <div className="mb-8 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-2">
            🎭 캐릭터 & 시뮬레이션
          </h3>
          <p className="text-sm text-purple-800 dark:text-purple-300 mb-3">
            1:1 대화 캐릭터나 다중 캐릭터 시뮬레이션을 자유롭게 만들어보세요.
          </p>
          <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
            <li>• <strong>1:1 캐릭터:</strong> 특정 페르소나와 대화</li>
            <li>• <strong>시뮬레이션:</strong> 다수의 캐릭터가 등장하는 세계관 (소설 쓰기 등)</li>
            <li>• 시스템 프롬프트에서 모든 설정 가능</li>
          </ul>
        </div>

        {/* 캐릭터 그리드 */}
        {characters && characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <CharacterCard key={character.id} character={character} />
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              아직 생성된 캐릭터가 없습니다
            </p>
            <Link
              href="/dashboard/characters/new"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              첫 캐릭터 만들기
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
