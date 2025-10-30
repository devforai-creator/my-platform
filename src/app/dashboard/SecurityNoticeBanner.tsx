'use client'

import { useState } from 'react'
import Link from 'next/link'

// 배너 자동 만료 날짜 (2025-11-06 = 1주일 후)
const BANNER_EXPIRE_DATE = new Date('2025-11-06T23:59:59')

export default function SecurityNoticeBanner() {
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('security-notice-v0.1.5-dismissed') === 'true'
    }
    return false
  })

  // 만료일 체크
  const isExpired = new Date() > BANNER_EXPIRE_DATE

  if (isExpired) return null

  const handleDismiss = () => {
    localStorage.setItem('security-notice-v0.1.5-dismissed', 'true')
    setIsDismissed(true)
  }

  if (isDismissed) return null

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6 relative">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
            🔒 중요 보안 업데이트 (v0.1.5)
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
            <p className="mb-2">
              <strong>보안 강화 완료:</strong> API 키 보호 메커니즘이 크게 개선되었습니다.
            </p>
            <p className="mb-3">
              안전을 위해 <strong>모든 기존 API 키가 삭제</strong>되었습니다.
              불편을 드려 죄송합니다.
            </p>
            <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded p-3 mb-3">
              <p className="font-semibold mb-2">📝 조치 사항:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>새로운 API 키를 다시 등록해주세요</li>
                <li>이전보다 훨씬 안전해진 시스템을 이용하실 수 있습니다</li>
              </ol>
            </div>
            <div className="flex gap-3 mt-3">
              <Link
                href="/dashboard/api-keys"
                className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700 transition-colors"
              >
                API 키 등록하기 →
              </Link>
              <a
                href="https://github.com/devforai-creator/my-platform/blob/main/CHANGELOG.md#015---2025-10-30"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 text-yellow-800 dark:text-yellow-300 text-sm font-medium hover:underline"
              >
                상세 내용 보기
              </a>
            </div>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={handleDismiss}
            className="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 focus:outline-none transition-colors"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
