'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signup } from '../actions'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)

    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
    }
    // 성공 시 redirect가 자동으로 처리됨
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            회원가입
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            무료로 시작하세요
          </p>
        </div>

        {/* 신규 가입 중단 안내 */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 px-4 py-4 rounded-lg">
          <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
            신규 가입이 일시 중단되었습니다
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            현재 보안 강화 및 개선 작업을 위해 신규 가입을 받지 않고 있습니다.
            기존 사용자는 계속 이용 가능합니다.
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            오픈소스 코드는 <a
              href="https://github.com/devforai-creator/my-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-900 dark:hover:text-yellow-100"
            >
              GitHub
            </a>에서 확인하실 수 있습니다.
          </p>
        </div>

        <form action={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                닉네임
              </label>
              <input
                id="display_name"
                name="display_name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="홍길동"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                최소 6자 이상
              </p>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={true}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed transition-colors"
            >
              회원가입 중단됨
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              이미 계정이 있으신가요?{' '}
            </span>
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              로그인
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
