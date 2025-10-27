'use client'

import { useState } from 'react'
import { createApiKey } from './actions'

const PROVIDERS = [
  { value: 'google', label: 'Google (Gemini)', recommended: true },
  { value: 'openai', label: 'OpenAI (GPT)', recommended: false },
  { value: 'anthropic', label: 'Anthropic (Claude)', recommended: false },
] as const

const MODELS = {
  google: [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
}

export default function AddApiKeyForm() {
  const [provider, setProvider] = useState<'google' | 'openai' | 'anthropic'>('google')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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
    <form
      id="add-api-key-form"
      action={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
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
            onChange={(e) => setProvider(e.target.value as any)}
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

      {/* 가이드 링크 */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          API 키 발급 방법:
        </p>
        <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
          <li>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              → Google Gemini API 키 발급
            </a>
          </li>
          <li>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              → OpenAI API 키 발급
            </a>
          </li>
          <li>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              → Anthropic API 키 발급
            </a>
          </li>
        </ul>
      </div>
    </form>
  )
}
