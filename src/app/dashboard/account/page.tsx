import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DeleteAccountButton from './DeleteAccountButton'

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <span aria-hidden>←</span>
          대시보드로 돌아가기
        </Link>

        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              계정 설정
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {profile?.display_name || user.email} ({user.email})
            </p>
          </div>

          <div className="px-6 py-8 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                계정 삭제
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                계정을 삭제하면 저장된 캐릭터, 채팅 기록, API 키 정보가 모두 영구적으로
                제거됩니다. 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="mt-6">
                <DeleteAccountButton />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
