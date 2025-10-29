import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import type { LanguageModel } from 'ai'
import { generateText } from 'ai'
import type { ChatSummary } from '@/types/database.types'
import type { ChatSummariesSupabaseClient } from './chat-summaries'
import { SUMMARY_CONFIG, updateSummaries } from './chat-summaries'

const generateTextMock = vi.mocked(generateText)

type ChatRole = 'user' | 'assistant'

interface MessageRow {
  chat_id: string
  sequence: number
  role: ChatRole
  content: string
}

type ChatSummaryRow = ChatSummary

const {
  SUMMARY_LEVEL_CHUNK,
  SUMMARY_LEVEL_META,
  CHUNK_SIZE,
} = SUMMARY_CONFIG

type Predicate<T> = (row: T) => boolean

class BaseQuery<T extends Record<string, unknown>> {
  constructor(
    private readonly source: () => T[],
    private readonly projector: (row: T) => Record<string, unknown>
  ) {}

  private filters: Predicate<T>[] = []
  private orderSpec: { field: keyof T; ascending: boolean } | null = null
  private limitCount: number | null = null

  eq(field: keyof T, value: unknown) {
    this.filters.push((row) => row[field] === value)
    return this
  }

  gt(field: keyof T, value: number) {
    this.filters.push((row) => Number(row[field]) > value)
    return this
  }

  order(field: keyof T, options?: { ascending?: boolean }) {
    this.orderSpec = { field, ascending: options?.ascending ?? true }
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  maybeSingle<R = Record<string, unknown>>() {
    const [first] = this.projectRows(this.materializeRows())
    return Promise.resolve({
      data: (first as R | undefined) ?? null,
      error: null,
    })
  }

  then<TResult1 = { data: Record<string, unknown>[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Record<string, unknown>[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
  }

  protected materializeRows(): T[] {
    let rows = this.source().filter((row) => this.filters.every((predicate) => predicate(row)))

    if (this.orderSpec) {
      const { field, ascending } = this.orderSpec
      rows = rows
        .slice()
        .sort((a, b) => {
          const av = a[field]
          const bv = b[field]
          if (av === bv) {
            return 0
          }
          if (av === undefined) {
            return ascending ? 1 : -1
          }
          if (bv === undefined) {
            return ascending ? -1 : 1
          }
          return (av > bv ? 1 : -1) * (ascending ? 1 : -1)
        })
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount)
    }

    return rows
  }

  protected projectRows(rows: T[]) {
    return rows.map((row) => ({ ...this.projector(row) }))
  }

  private resolve() {
    return {
      data: this.projectRows(this.materializeRows()),
      error: null,
    }
  }
}

function mapColumns<T extends Record<string, unknown>>(columns: string) {
  const parts = columns
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const selectAll = parts.length === 0 || parts.includes('*')

  if (selectAll) {
    return (row: T) => ({ ...row })
  }

  return (row: T) => {
    const result: Record<string, unknown> = {}
    for (const key of parts) {
      result[key] = row[key as keyof T]
    }
    return result
  }
}

class SupabaseMock {
  constructor(messages: MessageRow[]) {
    this.messages = messages
    this.chatSummaries = []
  }

  messages: MessageRow[]
  chatSummaries: ChatSummaryRow[]

  from(table: string) {
    if (table === 'messages') {
      return new MessagesTable(this)
    }
    if (table === 'chat_summaries') {
      return new ChatSummariesTable(this)
    }
    throw new Error(`Unsupported table "${table}"`)
  }
}

class MessagesTable {
  constructor(private readonly mock: SupabaseMock) {}

  select(columns: string, options?: { count?: string; head?: boolean }) {
    if (options?.head) {
      return new MessagesCountQuery(this.mock)
    }
    return new MessagesQuery(this.mock, columns)
  }
}

class MessagesCountQuery {
  constructor(private readonly mock: SupabaseMock) {}

  async eq(field: keyof MessageRow, value: unknown) {
    const count = this.mock.messages.filter((row) => row[field] === value).length
    return { count, error: null }
  }
}

class ChatSummariesTable {
  constructor(private readonly mock: SupabaseMock) {}

  select(columns: string) {
    return new ChatSummariesQuery(this.mock, columns)
  }

  insert(data: {
    chat_id: string
    level: number
    start_seq: number
    end_seq: number
    summary: string
    token_count: number | null
  }) {
    const row: ChatSummaryRow = {
      id: `summary-${this.mock.chatSummaries.length + 1}`,
      chat_id: data.chat_id,
      level: data.level,
      start_seq: data.start_seq,
      end_seq: data.end_seq,
      summary: data.summary,
      token_count: data.token_count,
      created_at: new Date().toISOString(),
    }
    this.mock.chatSummaries.push(row)
    return Promise.resolve({ data: row, error: null })
  }
}

class ChatSummariesQuery extends BaseQuery<ChatSummaryRow> {
  constructor(mock: SupabaseMock, columns: string) {
    super(
      () => mock.chatSummaries,
      mapColumns<ChatSummaryRow>(columns)
    )
  }
}

class MessagesQuery extends BaseQuery<MessageRow> {
  constructor(mock: SupabaseMock, columns: string) {
    super(
      () => mock.messages,
      mapColumns<MessageRow>(columns)
    )
  }

  range(from: number, to: number) {
    const rows = this.materializeRows()
    const slice = rows.slice(from, to + 1)
    return Promise.resolve({
      data: this.projectRows(slice),
      error: null,
    })
  }
}

function makeMessages(total: number, chatId = 'chat-1'): MessageRow[] {
  return Array.from({ length: total }, (_, index) => ({
    chat_id: chatId,
    sequence: index + 1,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message-${index + 1}`,
  }))
}

const MODEL = {} as LanguageModel

function createSupabaseMock(messages: MessageRow[]) {
  return new SupabaseMock(messages)
}

describe('updateSummaries integration smoke tests', () => {
  beforeEach(() => {
    generateTextMock.mockReset()
  })

  it('creates the first chunk summary once the threshold is reached', async () => {
    const supabaseMock = createSupabaseMock(makeMessages(CHUNK_SIZE * 2))

    generateTextMock.mockResolvedValue({
      text: 'chunk summary result',
      usage: { completionTokens: 55 },
    })

    await updateSummaries({
      supabase: supabaseMock as unknown as ChatSummariesSupabaseClient,
      chatId: 'chat-1',
      model: MODEL,
    })

    expect(generateTextMock).toHaveBeenCalledTimes(1)

    const chunkSummaries = supabaseMock.chatSummaries.filter(
      (row) => row.level === SUMMARY_LEVEL_CHUNK
    )

    expect(chunkSummaries).toHaveLength(1)
    expect(chunkSummaries[0]).toMatchObject({
      start_seq: 1,
      end_seq: 10,
      summary: 'chunk summary result',
      token_count: 55,
    })

    expect(
      supabaseMock.chatSummaries.filter((row) => row.level === SUMMARY_LEVEL_META)
    ).toHaveLength(0)
  })

  it('builds sequential chunk summaries and a meta summary when enough history accumulates', async () => {
    const supabaseMock = createSupabaseMock(makeMessages(CHUNK_SIZE * 12))

    generateTextMock.mockImplementation(async ({ prompt }: { prompt: string }) => {
      if (prompt.startsWith('Create a concise higher-level summary')) {
        return { text: 'meta summary result', usage: { completionTokens: 88 } }
      }
      return { text: 'chunk summary result', usage: { completionTokens: 44 } }
    })

    await updateSummaries({
      supabase: supabaseMock as unknown as ChatSummariesSupabaseClient,
      chatId: 'chat-1',
      model: MODEL,
    })

    const chunkSummaries = supabaseMock.chatSummaries.filter(
      (row) => row.level === SUMMARY_LEVEL_CHUNK
    )
    expect(chunkSummaries).toHaveLength(11)
    expect(chunkSummaries[0]).toMatchObject({ start_seq: 1, end_seq: 10, summary: 'chunk summary result', token_count: 44 })
    expect(chunkSummaries[10]).toMatchObject({ start_seq: 101, end_seq: 110 })

    const metaSummaries = supabaseMock.chatSummaries.filter(
      (row) => row.level === SUMMARY_LEVEL_META
    )
    expect(metaSummaries).toHaveLength(1)
    expect(metaSummaries[0]).toMatchObject({
      start_seq: 1,
      end_seq: 100,
      summary: 'meta summary result',
      token_count: 88,
    })
  })

  it('falls back to deterministic highlights when the LLM call fails', async () => {
    const supabaseMock = createSupabaseMock(makeMessages(CHUNK_SIZE * 2))

    generateTextMock.mockRejectedValueOnce(new Error('upstream unavailable'))

    await updateSummaries({
      supabase: supabaseMock as unknown as ChatSummariesSupabaseClient,
      chatId: 'chat-1',
      model: MODEL,
    })

    const [chunk] = supabaseMock.chatSummaries
    expect(chunk.summary).toContain('요약 실패')
    expect(chunk.token_count).toBeNull()
  })
})
