'use client'

import { useState } from 'react'
import { createCharacter, updateCharacter } from './actions'
import type { Character } from '@/types/database.types'

interface Props {
  character?: Character
}

const TEMPLATES = [
  {
    id: 'blank',
    name: '빈 템플릿',
    description: '처음부터 직접 작성',
    systemPrompt: '',
    greeting: '',
  },
  {
    id: 'simple-character',
    name: '1:1 캐릭터 템플릿',
    description: '기본적인 캐릭터 대화',
    systemPrompt: `You are [캐릭터 이름], a [역할/직업].

성격: [성격 특징을 작성하세요]
말투: [말투 특징을 작성하세요]
배경: [캐릭터의 배경 스토리]

사용자와 자연스럽게 대화하며 캐릭터의 페르소나를 유지하세요.`,
    greeting: '안녕하세요! 만나서 반가워요.',
  },
  {
    id: 'simulation',
    name: '시뮬레이션 템플릿',
    description: '다중 캐릭터 세계관',
    systemPrompt: `This is a [시뮬레이션 세계관 설명].

## 등장 캐릭터들:

1. [캐릭터 A 이름] - [역할]
   - 성격: [특징]
   - 말투: [특징]

2. [캐릭터 B 이름] - [역할]
   - 성격: [특징]
   - 말투: [특징]

3. [캐릭터 C 이름] - [역할]
   - 성격: [특징]
   - 말투: [특징]

## 규칙:
- 모든 캐릭터를 조종하여 상황을 서술하세요
- 각 캐릭터의 대사는 "캐릭터 이름: 대사" 형식으로 작성
- 장면과 분위기를 상세히 묘사하세요`,
    greeting: '[첫 장면 묘사를 여기에 작성]',
  },
]

export default function CharacterForm({ character }: Props) {
  const isEditing = !!character
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = isEditing
      ? await updateCharacter(character.id, formData)
      : await createCharacter(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // 성공 시 redirect가 자동으로 처리됨
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplate(templateId)
    const template = TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    const form = document.getElementById(
      'character-form'
    ) as HTMLFormElement
    if (!form) return

    const systemPromptEl = form.querySelector(
      '[name="system_prompt"]'
    ) as HTMLTextAreaElement
    const greetingEl = form.querySelector(
      '[name="greeting_message"]'
    ) as HTMLTextAreaElement

    if (systemPromptEl) systemPromptEl.value = template.systemPrompt
    if (greetingEl) greetingEl.value = template.greeting
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
      {/* 템플릿 선택 (생성 시에만) */}
      {!isEditing && (
        <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            템플릿 선택
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedTemplate === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 폼 */}
      <form id="character-form" action={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={character?.name}
            placeholder="예: Alice / 판타지 주점 시뮬레이션"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            설명
          </label>
          <textarea
            name="description"
            rows={2}
            defaultValue={character?.description || ''}
            placeholder="캐릭터 또는 시뮬레이션에 대한 간단한 설명"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
          />
        </div>

        {/* 시스템 프롬프트 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            시스템 프롬프트 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="system_prompt"
            rows={12}
            required
            defaultValue={character?.system_prompt}
            placeholder="캐릭터의 페르소나, 말투, 배경 등을 자유롭게 작성하세요.&#10;또는 시뮬레이션의 세계관, 등장 캐릭터, 규칙 등을 작성하세요."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            AI에게 전달되는 핵심 지시사항입니다. 구체적으로 작성할수록 좋습니다.
          </p>
        </div>

        {/* 첫 인사말 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            첫 인사말 (선택)
          </label>
          <textarea
            name="greeting_message"
            rows={3}
            defaultValue={character?.greeting_message || ''}
            placeholder="대화 시작 시 AI가 먼저 할 말 (비워두면 사용자가 먼저 시작)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? isEditing
                ? '수정 중...'
                : '생성 중...'
              : isEditing
              ? '캐릭터 수정'
              : '캐릭터 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
