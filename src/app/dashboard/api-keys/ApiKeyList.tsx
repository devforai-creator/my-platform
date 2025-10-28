'use client'

import { useState } from 'react'
import type { ApiKey } from '@/types/database.types'
import { deleteApiKey, toggleApiKey } from './actions'

interface Props {
  apiKeys: ApiKeyListItem[]
}

const PROVIDER_COLORS = {
  google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  openai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  anthropic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

const PROVIDER_LABELS = {
  google: 'Google',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

type ApiKeyListItem = Omit<ApiKey, 'vault_secret_name' | 'user_id'>

export default function ApiKeyList({ apiKeys }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('정말 이 API 키를 삭제하시겠습니까?')) {
      return
    }

    setDeletingId(id)
    await deleteApiKey(id)
    setDeletingId(null)
  }

  async function handleToggle(id: string, isActive: boolean) {
    await toggleApiKey(id, isActive)
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((key) => (
        <div
          key={key.id}
          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    PROVIDER_COLORS[key.provider as keyof typeof PROVIDER_COLORS]
                  }`}
                >
                  {PROVIDER_LABELS[key.provider as keyof typeof PROVIDER_LABELS]}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    key.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {key.is_active ? '활성' : '비활성'}
                </span>
              </div>

              {/* Key Name */}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {key.key_name}
              </h3>

              {/* Model */}
              {key.model_preference && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  모델: {key.model_preference}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  등록: {new Date(key.created_at).toLocaleDateString('ko-KR')}
                </span>
                {key.last_used_at && (
                  <span>
                    마지막 사용:{' '}
                    {new Date(key.last_used_at).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>

              {/* Notes */}
              {key.usage_notes && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                  {key.usage_notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 ml-4">
              <button
                onClick={() => handleToggle(key.id, key.is_active)}
                className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {key.is_active ? '비활성화' : '활성화'}
              </button>
              <button
                onClick={() => handleDelete(key.id)}
                disabled={deletingId === key.id}
                className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
              >
                {deletingId === key.id ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
