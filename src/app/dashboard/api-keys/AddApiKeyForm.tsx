'use client'

import { useState } from 'react'
import { createApiKey } from './actions'
import GoogleApiKeySidePanel from './GoogleApiKeySidePanel'

const PROVIDERS = [
  { value: 'google', label: 'Google (Gemini)', recommended: true },
  { value: 'openai', label: 'OpenAI (GPT)', recommended: false },
  { value: 'anthropic', label: 'Anthropic (Claude)', recommended: false },
] as const

type ProviderValue = (typeof PROVIDERS)[number]['value']

const MODELS = {
  google: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ],
  openai: [
    'gpt-5',
    'gpt-4.1',
    'gpt-4.1-nano',
  ],
  anthropic: [
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'claude-opus-4-1',
  ],
}

export default function AddApiKeyForm() {
  const [provider, setProvider] = useState<ProviderValue>('google')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await createApiKey(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      // 폼 리셋
      ;(document.getElementById('add-api-key-form') as HTMLFormElement)?.reset()
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <>
      <form
        id="add-api-key-form"
        action={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        {/* Guide Button */}
        {provider === 'google' && (
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="w-full mb-4 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>📖 Google API 키 발급 가이드 보기</span>
          </button>
        )}

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
            API 키가 안전하게 등록되었습니다!
          </div>
        )}

      <div className="space-y-4">
        {/* Provider 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Provider
          </label>
          <select
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderValue)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} {p.recommended ? '(추천)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 키 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            키 이름
          </label>
          <input
            type="text"
            name="key_name"
            placeholder="예: 내 개인 Gemini 키"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>
          <input
            type="password"
            name="api_key"
            placeholder="sk-... 또는 AIza..."
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            암호화되어 안전하게 저장됩니다
          </p>
        </div>

        {/* 모델 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            기본 모델 (선택)
          </label>
          <select
            name="model_preference"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">선택 안 함</option>
            {MODELS[provider].map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '등록 중...' : 'API 키 등록'}
        </button>
      </div>
    </form>

      {/* Side Panel */}
      <GoogleApiKeySidePanel
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </>
  )
}
