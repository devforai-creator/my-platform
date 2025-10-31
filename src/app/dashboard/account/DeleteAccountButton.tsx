'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAccount } from './actions'

export default function DeleteAccountButton() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleClick() {
    if (!confirm('정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setError(null)
    setIsDeleting(true)

    try {
      const result = await deleteAccount()

      if (result?.error) {
        setError(result.error)
        setIsDeleting(false)
        return
      }

      router.replace('/auth/login?accountDeleted=1')
    } catch (err) {
      console.error('[Account] deleteAccount unexpected error', err)
      setError('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isDeleting}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? '계정 삭제 중...' : '계정 삭제하기'}
      </button>
    </div>
  )
}
