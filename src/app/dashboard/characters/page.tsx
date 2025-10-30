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

  // 스타터 캐릭터 가져오기 (user_id = null)
  const { data: starterCharacters } = await supabase
    .from('characters')
    .select('*')
    .is('user_id', null)
    .is('archived_at', null)
    .eq('visibility', 'public')
    .order('created_at', { ascending: true })

  // 본인 캐릭터 가져오기
  const { data: myCharacters, error } = await supabase
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

        {/* 스타터 캐릭터 섹션 */}
        {starterCharacters && starterCharacters.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌟</span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  시작하기
                </h2>
              </div>
              <span className="ml-3 px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                추천
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              바로 대화를 시작할 수 있는 준비된 캐릭터들이에요
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {starterCharacters.map((character) => (
                <CharacterCard key={character.id} character={character} isStarter={true} />
              ))}
            </div>
          </div>
        )}

        {/* 내 캐릭터 섹션 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            내 캐릭터
          </h2>
          {myCharacters && myCharacters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCharacters.map((character) => (
                <CharacterCard key={character.id} character={character} isStarter={false} />
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
        </div>
      </main>
    </div>
  )
}
