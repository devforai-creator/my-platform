'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Character } from '@/types/database.types'
import { deleteCharacter } from './actions'

interface Props {
  character: Character
}

export default function CharacterCard({ character }: Props) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`"${character.name}"을(를) 정말 삭제하시겠습니까?`)) {
      return
    }

    setDeleting(true)
    await deleteCharacter(character.id)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* 캐릭터 헤더 */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {character.name}
            </h3>
            {character.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {character.description}
              </p>
            )}
          </div>
        </div>

        {/* 시스템 프롬프트 미리보기 */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            시스템 프롬프트
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 font-mono">
            {character.system_prompt}
          </p>
        </div>

        {/* 첫 인사말 */}
        {character.greeting_message && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              첫 인사말
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic line-clamp-2">
              "{character.greeting_message}"
            </p>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>
            생성: {new Date(character.created_at).toLocaleDateString('ko-KR')}
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
            {character.visibility}
          </span>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          <Link
            href={`/dashboard/chats/new?character=${character.id}`}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
          >
            채팅 시작
          </Link>
          <Link
            href={`/dashboard/characters/${character.id}/edit`}
            className="py-2 px-4 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="py-2 px-4 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {deleting ? '...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
