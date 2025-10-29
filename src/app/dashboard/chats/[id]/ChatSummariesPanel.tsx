import type { ChatSummary } from '@/types/database.types'

interface ChatSummariesPanelProps {
  summaries: Array<
    Pick<ChatSummary, 'id' | 'level' | 'start_seq' | 'end_seq' | 'summary' | 'created_at'>
  >
  totalMessages: number
}

const LEVEL_LABEL: Record<number, string> = {
  1: '메타 요약',
  0: '청크 요약',
}

function formatTimestamp(value: string | null): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function ChatSummariesPanel({
  summaries,
  totalMessages,
}: ChatSummariesPanelProps) {
  const metaSummaries = summaries
    .filter((summary) => summary.level === 1)
    .sort((a, b) => a.start_seq - b.start_seq)

  const chunkSummaries = summaries
    .filter((summary) => summary.level === 0)
    .sort((a, b) => a.start_seq - b.start_seq)

  const hasSummaries = summaries.length > 0
  const nextThreshold =
    totalMessages < 20 ? 20 : Math.ceil(totalMessages / 10) * 10 + 10

  return (
    <aside className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:h-full lg:w-96 lg:flex-shrink-0 lg:border-l lg:border-t-0">
      <div className="h-full overflow-y-auto p-4 lg:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            장기기억 요약
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            최근 20개 메시지는 그대로 유지되고, 그 이전 대화는 10개씩 묶어 요약됩니다.
            요약은 자동으로 생성되며, 생성까지 약간의 지연이 있을 수 있습니다.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
          <p>
            총 메시지: <span className="font-medium">{totalMessages}</span>개
          </p>
          <p className="mt-1">
            다음 요약 생성 시점:{' '}
            <span className="font-medium">{nextThreshold}개</span> 메시지 도달 시
          </p>
        </div>

        {!hasSummaries && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
            아직 생성된 요약이 없습니다. 대화를 20개 이상 이어가면 자동으로 요약이
            만들어집니다.
          </div>
        )}

        {metaSummaries.length > 0 && (
          <section className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              메타 요약
            </h3>
            <ul className="space-y-4">
              {metaSummaries.map((summary) => {
                const formattedTimestamp = formatTimestamp(summary.created_at)

                return (
                  <li
                    key={summary.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      {LEVEL_LABEL[summary.level]} · {summary.start_seq}-
                      {summary.end_seq}
                      {formattedTimestamp ? ` · ${formattedTimestamp}` : null}
                    </div>
                    <p className="whitespace-pre-line text-sm leading-5 text-gray-800 dark:text-gray-200">
                      {summary.summary}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {chunkSummaries.length > 0 && (
          <section className="mt-8 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              청크 요약
            </h3>
            <ul className="space-y-3">
              {chunkSummaries.map((summary) => {
                const formattedTimestamp = formatTimestamp(summary.created_at)

                return (
                  <li
                    key={summary.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      {LEVEL_LABEL[summary.level]} · {summary.start_seq}-
                      {summary.end_seq}
                      {formattedTimestamp ? ` · ${formattedTimestamp}` : null}
                    </div>
                    <p className="whitespace-pre-line text-sm leading-5 text-gray-800 dark:text-gray-200">
                      {summary.summary}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {hasSummaries && (
          <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
            요약 패널은 페이지 새로고침 후 최신 상태로 반영됩니다.
          </p>
        )}
      </div>
    </aside>
  )
}
