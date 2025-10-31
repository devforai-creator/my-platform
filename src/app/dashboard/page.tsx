import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '../auth/actions'
import QuickStartGuide from './QuickStartGuide'
import SecurityNoticeBanner from './SecurityNoticeBanner'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 전체 토큰 사용량 통계 계산
  const { data: allMessages } = await supabase
    .from('messages')
    .select('prompt_tokens, completion_tokens, chat_id, chats!inner(user_id)')
    .eq('chats.user_id', user.id)

  const totalTokenStats = allMessages?.reduce(
    (acc, msg) => ({
      total: acc.total + (msg.prompt_tokens || 0) + (msg.completion_tokens || 0),
      prompt: acc.prompt + (msg.prompt_tokens || 0),
      completion: acc.completion + (msg.completion_tokens || 0),
    }),
    { total: 0, prompt: 0, completion: 0 }
  ) || { total: 0, prompt: 0, completion: 0 }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CharacterChat Platform
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {profile?.display_name || user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 보안 공지 배너 */}
        <SecurityNoticeBanner />

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            환영합니다! 👋
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Phase 0 MVP - BYOK 기반 캐릭터 채팅 플랫폼
          </p>
        </div>

        {/* 토큰 사용량 통계 */}
        <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">토큰 사용량 통계</h3>
            <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90 mb-1">총 사용량</div>
              <div className="text-3xl font-bold">
                {totalTokenStats.total.toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-1">tokens</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90 mb-1">입력 토큰</div>
              <div className="text-3xl font-bold">
                {totalTokenStats.prompt.toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-1">prompt tokens</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-4">
              <div className="text-sm opacity-90 mb-1">출력 토큰</div>
              <div className="text-3xl font-bold">
                {totalTokenStats.completion.toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-1">completion tokens</div>
            </div>
          </div>
          <div className="mt-4 text-xs opacity-75">
            💡 BYOK 방식으로 비용을 직접 관리하세요. Google Gemini 무료 티어: 월 15 RPM
          </div>
        </div>

        {/* 퀵 액션 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* API 키 관리 */}
          <Link
            href="/dashboard/api-keys"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              API 키 관리
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Google, OpenAI, Anthropic API 키를 등록하고 관리하세요
            </p>
          </Link>

          {/* 캐릭터 관리 */}
          <Link
            href="/dashboard/characters"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              캐릭터 관리
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI 캐릭터를 생성하고 커스터마이즈하세요
            </p>
          </Link>

          {/* 채팅 시작 */}
          <Link
            href="/dashboard/chats"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              채팅 시작
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              캐릭터와 대화를 시작하세요
            </p>
          </Link>

          <Link
            href="/dashboard/account"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              계정 설정
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              계정 삭제 등 민감한 작업을 관리하세요
            </p>
          </Link>
        </div>

        {/* 시작 가이드 */}
        <QuickStartGuide />
      </main>
    </div>
  )
}
