import { describe, expect, it } from 'vitest'
import type { ChatSummariesSupabaseClient } from './chat-summaries'
import {
  buildContext,
  calculateChunkBoundaries,
  formatSummarySegments,
  areChunksSequential,
  SUMMARY_CONFIG,
  type SanitizedMessage,
} from './chat-summaries'

function createSupabaseStub<T>(data: T): ChatSummariesSupabaseClient {
  const query = {
    select() {
      return query
    },
    eq() {
      return query
    },
    lte() {
      return query
    },
    order() {
      return query
    },
    data,
    error: null,
  }

  return {
    from(table: string) {
      if (table !== 'chat_summaries') {
        throw new Error(`Unexpected table: ${table}`)
      }

      return query
    },
  } as unknown as ChatSummariesSupabaseClient
}

function makeMessages(count: number): SanitizedMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `message-${index + 1}`,
  }))
}

describe('formatSummarySegments', () => {
  it('labels meta and chunk summaries correctly', () => {
    const segments = formatSummarySegments([
      { level: SUMMARY_CONFIG.SUMMARY_LEVEL_CHUNK, start_seq: 1, end_seq: 10, summary: ' First chunk. ' },
      { level: SUMMARY_CONFIG.SUMMARY_LEVEL_META, start_seq: 1, end_seq: 100, summary: ' Meta summary ' },
    ])

    expect(segments).toEqual([
      '[요약 1-10]\nFirst chunk.',
      '[메타 요약 1-100]\nMeta summary',
    ])
  })
})

describe('calculateChunkBoundaries', () => {
  const { CONTEXT_WINDOW, CHUNK_SIZE } = SUMMARY_CONFIG

  it('emits first chunk once total messages reach the trigger point', () => {
    const totalMessages = CONTEXT_WINDOW
    expect(calculateChunkBoundaries(totalMessages, 0)).toEqual([
      { start: 1, end: 10 },
    ])
  })

  it('returns sequential chunk ranges up to the cut-off', () => {
    const totalMessages = CONTEXT_WINDOW + CHUNK_SIZE * 2
    expect(calculateChunkBoundaries(totalMessages, 0)).toEqual([
      { start: 1, end: 10 },
      { start: 11, end: 20 },
      { start: 21, end: 30 },
    ])
  })

  it('respects previously summarized range', () => {
    const totalMessages = CONTEXT_WINDOW + CHUNK_SIZE * 3
    expect(calculateChunkBoundaries(totalMessages, 20)).toEqual([
      { start: 21, end: 30 },
      { start: 31, end: 40 },
    ])
  })

  it('does not emit new chunks if we are between triggers', () => {
    const totalMessages = CONTEXT_WINDOW + CHUNK_SIZE - 1
    expect(calculateChunkBoundaries(totalMessages, CHUNK_SIZE)).toEqual([])
    expect(calculateChunkBoundaries(totalMessages, CHUNK_SIZE * 2)).toEqual([])
  })

  it('skips chunks already summarized', () => {
    const totalMessages = CONTEXT_WINDOW + CHUNK_SIZE * 4
    expect(calculateChunkBoundaries(totalMessages, 30)).toEqual([
      { start: 31, end: 40 },
      { start: 41, end: 50 },
    ])
  })
})

describe('areChunksSequential', () => {
  it('returns true for adjacent chunk ranges', () => {
    expect(
      areChunksSequential([
        { start_seq: 1, end_seq: 10 },
        { start_seq: 11, end_seq: 20 },
        { start_seq: 21, end_seq: 30 },
      ])
    ).toBe(true)
  })

  it('returns false when chunks have gaps', () => {
    expect(
      areChunksSequential([
        { start_seq: 1, end_seq: 10 },
        { start_seq: 12, end_seq: 21 },
      ])
    ).toBe(false)
  })
})

describe('buildContext', () => {
  it('falls back to base prompt when summaries absent', async () => {
    const supabase = createSupabaseStub([])
    const messages = makeMessages(5)

    const result = await buildContext({
      supabase,
      chatId: 'chat-1',
      sanitizedMessages: messages,
      baseSystemPrompt: 'BASE PROMPT',
    })

    expect(result.systemPrompt).toBe('BASE PROMPT')
    expect(result.recentMessages).toEqual(messages)
  })

  it('includes summaries and trims to context window', async () => {
    const summaries = [
      {
        level: SUMMARY_CONFIG.SUMMARY_LEVEL_META,
        start_seq: 1,
        end_seq: 100,
        summary: 'Important high-level recap.',
      },
      {
        level: SUMMARY_CONFIG.SUMMARY_LEVEL_CHUNK,
        start_seq: 101,
        end_seq: 110,
        summary: 'Detailed chunk recap.',
      },
    ]
    const supabase = createSupabaseStub(summaries)
    const messages = makeMessages(25)

    const result = await buildContext({
      supabase,
      chatId: 'chat-1',
      sanitizedMessages: messages,
      baseSystemPrompt: 'BASE PROMPT',
    })

    expect(result.recentMessages).toHaveLength(SUMMARY_CONFIG.CONTEXT_WINDOW)
    expect(result.recentMessages[0]).toEqual(messages[5])
    expect(result.systemPrompt).toContain('BASE PROMPT')
    expect(result.systemPrompt).toContain('[메타 요약 1-100]')
    expect(result.systemPrompt).toContain('[요약 101-110]')
  })
})
