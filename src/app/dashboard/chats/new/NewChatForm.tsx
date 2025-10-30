'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Character, ApiKey } from '@/types/database.types'

interface Props {
  characters: Character[]
  apiKeys: ApiKeyOption[]
  preselectedCharacterId?: string
}

type ApiKeyOption = Pick<ApiKey, 'id' | 'key_name' | 'provider' | 'model_preference'>

export default function NewChatForm({
  characters,
  apiKeys,
  preselectedCharacterId,
}: Props) {
  const router = useRouter()
  const [characterId, setCharacterId] = useState(preselectedCharacterId || '')
  const [apiKeyId, setApiKeyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다')
        setLoading(false)
        return
      }

      // 선택한 캐릭터 정보 가져오기
      const character = characters.find((c) => c.id === characterId)

      // 채팅 생성
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          character_id: characterId,
          title: `${character?.name}와의 대화`,
        })
        .select()
        .single()

      if (chatError) {
        throw chatError
      }

      // 첫 인사말이 있으면 추가
      if (character?.greeting_message) {
        await supabase.from('messages').insert({
          chat_id: chat.id,
          role: 'assistant',
          content: character.greeting_message,
        })
      }

      // 채팅 페이지로 이동 (API 키 ID 전달)
      router.push(`/dashboard/chats/${chat.id}?apiKey=${apiKeyId}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '채팅 생성에 실패했습니다'
      setError(message)
      setLoading(false)
    }
  }

  const selectedCharacter = characters.find((c) => c.id === characterId)
  const selectedApiKey = apiKeys.find((k) => k.id === apiKeyId)

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8"
    >
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 캐릭터 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            캐릭터 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">캐릭터를 선택하세요</option>
            {characters
              .sort((a, b) => {
                // 스타터를 먼저 표시
                if (!a.user_id && b.user_id) return -1
                if (a.user_id && !b.user_id) return 1
                return 0
              })
              .map((character) => (
                <option key={character.id} value={character.id}>
                  {character.user_id ? character.name : `🌟 ${character.name} (추천)`}
                </option>
              ))}
          </select>

          {selectedCharacter && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {selectedCharacter.description}
              </p>
              {selectedCharacter.greeting_message && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  첫 인사: <span>&quot;</span>
                  {selectedCharacter.greeting_message}
                  <span>&quot;</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* API 키 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API 키 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={apiKeyId}
            onChange={(e) => setApiKeyId(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">API 키를 선택하세요</option>
            {apiKeys.map((key) => (
              <option key={key.id} value={key.id}>
                {key.key_name} ({key.provider})
                {key.model_preference && ` - ${key.model_preference}`}
              </option>
            ))}
          </select>

          {selectedApiKey && (
            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>{selectedApiKey.provider}</strong> 제공자의 API를
                사용합니다
              </p>
              {selectedApiKey.model_preference && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  모델: {selectedApiKey.model_preference}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading || !characterId || !apiKeyId}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '생성 중...' : '채팅 시작'}
        </button>
      </div>
    </form>
  )
}
