'use client'

import { useChat } from 'ai/react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Message, ApiKey } from '@/types/database.types'

interface TokenStats {
  total: number
  prompt: number
  completion: number
}

interface Props {
  chatId: string
  initialMessages: Message[]
  apiKeys: ApiKeyOption[]
  preselectedApiKeyId?: string
  initialTokenStats: TokenStats
}

type ApiKeyOption = Pick<ApiKey, 'id' | 'key_name' | 'provider' | 'model_preference'>

export default function ChatInterface({
  chatId,
  initialMessages,
  apiKeys,
  preselectedApiKeyId,
  initialTokenStats,
}: Props) {
  const [selectedApiKeyId, setSelectedApiKeyId] = useState(
    preselectedApiKeyId || apiKeys[0]?.id || ''
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats>(initialTokenStats)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const selectedApiKey = apiKeys.find((k) => k.id === selectedApiKeyId)

  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    id: chatId,
    initialMessages: initialMessages.map((m) => ({
      id: m.id,
      role:
        m.role === 'user' || m.role === 'assistant' || m.role === 'system'
          ? m.role
          : 'assistant',
      content: m.content,
    })),
    body: {
      chatId,
      provider: selectedApiKey?.provider,
      apiKeyId: selectedApiKeyId,
    },
    keepLastMessageOnError: true,
    onError: (err) => {
      const messageText =
        err instanceof Error ? err.message : typeof err === 'string' ? err : null

      // 빈 에러 메시지일 경우 (검열로 인한 빈 응답)
      if (!messageText) {
        // 1.5초 후 서버에서 시스템 메시지 확인
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/chats/${chatId}/messages/latest`)

            if (!response.ok) {
              return
            }

            const latestMessage = await response.json()

            // 시스템 메시지가 있으면 추가
            if (latestMessage?.role === 'system') {
              setErrorBanner(latestMessage.content)
              setMessages((prev) => [
                ...prev,
                {
                  id: latestMessage.id,
                  role: 'system',
                  content: latestMessage.content,
                  createdAt: new Date(latestMessage.created_at),
                },
              ])
            }
          } catch (error) {
            console.error('Error fetching latest message:', error)
          }
        }, 1500)
        return
      }

      setErrorBanner(messageText)
    },
    onFinish: (_message, { usage }) => {
      if (usage) {
        setTokenStats((prev) => ({
          total: prev.total + usage.totalTokens,
          prompt: prev.prompt + usage.promptTokens,
          completion: prev.completion + usage.completionTokens,
        }))
      }
    },
  })

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, errorBanner])

  useEffect(() => {
    if (error?.message) {
      setErrorBanner(error.message)
    }
  }, [error])

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      if (errorBanner) {
        setErrorBanner(null)
      }
      void handleSubmit(event)
    },
    [errorBanner, handleSubmit]
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* API 키 선택 바 & 토큰 사용량 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              API 키:
            </label>
            <select
              value={selectedApiKeyId}
              onChange={(e) => setSelectedApiKeyId(e.target.value)}
              className="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {apiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.key_name} ({key.provider})
                </option>
              ))}
            </select>
          </div>

          {/* 토큰 사용량 */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">총 토큰:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {tokenStats.total.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              (입력: {tokenStats.prompt.toLocaleString()} | 출력:{' '}
              {tokenStats.completion.toLocaleString()})
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          {errorBanner && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200 rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm whitespace-pre-wrap break-words">
                  {errorBanner}
                </div>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="text-xs text-red-600 dark:text-red-300 hover:underline"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p>대화를 시작해보세요!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user'
              const isSystem = message.role === 'system'
              const bubbleClasses = isUser
                ? 'bg-blue-600 text-white'
                : isSystem
                  ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-700'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${bubbleClasses}`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력 폼 */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleFormSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
              rows={3}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              {isLoading ? '전송 중...' : '전송'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Enter로 전송 | Shift+Enter로 줄바꿈
          </p>
        </form>
      </div>
    </div>
  )
}
