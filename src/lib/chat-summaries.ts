import { generateText } from 'ai'
import type { LanguageModel } from 'ai'
import type { ChatSummary, ChatSummaryInsert, Message } from '@/types/database.types'
import type { createClient as createServerClient } from '@/lib/supabase/server'

const CONTEXT_WINDOW = 20
const CHUNK_SIZE = 10
const SUMMARY_GROUP_SIZE = 10

const SUMMARY_LEVEL_CHUNK = 0
const SUMMARY_LEVEL_META = 1

const CHUNK_SUMMARY_MAX_TOKENS = 2048
const META_SUMMARY_MAX_TOKENS = 3072
const MESSAGE_CHAR_LIMIT = 1200
const FALLBACK_SUMMARY_CHAR_LIMIT = 700
const FALLBACK_RECENT_MESSAGES = 5

const CHUNK_SUMMARY_SYSTEM_PROMPT =
  'You are a diligent note-taking assistant. Summarize the following chat segment focusing on key facts, decisions, action items, and follow-ups. Omit greetings and filler. Respond in the predominant language of the excerpt. Keep it concise.'

const META_SUMMARY_SYSTEM_PROMPT =
  'You are compiling a higher-level recap from multiple chat summaries. Synthesize the main themes, decisions, and outstanding items. Preserve important names, numbers, and commitments without duplicating detail.'

type ChatRole = 'user' | 'assistant'

type SummaryRow = Pick<ChatSummary, 'level' | 'start_seq' | 'end_seq' | 'summary'>
type ChunkSummaryRow = Pick<ChatSummary, 'id' | 'start_seq' | 'end_seq' | 'summary'>
type MessageTranscriptRow = Pick<Message, 'role' | 'content'>
type ServerSupabaseClient = Awaited<ReturnType<typeof createServerClient>>
export type ChatSummariesSupabaseClient = ServerSupabaseClient

export interface SanitizedMessage {
  role: ChatRole
  content: string
}

interface BuildContextOptions {
  supabase: ServerSupabaseClient
  chatId: string
  sanitizedMessages: SanitizedMessage[]
  baseSystemPrompt: string
}

interface BuildContextResult {
  systemPrompt: string
  recentMessages: SanitizedMessage[]
}

interface UpdateSummariesOptions {
  supabase: ServerSupabaseClient
  chatId: string
  model: LanguageModel
}

export function formatSummarySegments(
  summaries: Array<Pick<ChatSummary, 'level' | 'start_seq' | 'end_seq' | 'summary'>>
): string[] {
  return summaries.map((summary) => {
    const label = summary.level === SUMMARY_LEVEL_META ? '메타 요약' : '요약'
    return `[${label} ${summary.start_seq}-${summary.end_seq}]\n${summary.summary.trim()}`
  })
}

export function calculateChunkBoundaries(
  totalMessages: number,
  previousEnd: number,
  chunkSize: number = CHUNK_SIZE
): Array<{ start: number; end: number }> {
  const latestChunkEnd = totalMessages - chunkSize

  if (latestChunkEnd < chunkSize || latestChunkEnd <= previousEnd) {
    return []
  }

  const boundaries: Array<{ start: number; end: number }> = []
  let nextChunkEnd = Math.max(previousEnd + chunkSize, chunkSize)

  while (nextChunkEnd <= latestChunkEnd) {
    const start = nextChunkEnd - chunkSize + 1
    const end = nextChunkEnd
    boundaries.push({ start, end })
    nextChunkEnd += chunkSize
  }

  return boundaries
}

export async function buildContext({
  supabase,
  chatId,
  sanitizedMessages,
  baseSystemPrompt,
}: BuildContextOptions): Promise<BuildContextResult> {
  const trimmedMessages = sanitizedMessages.slice(-CONTEXT_WINDOW)
  const totalIncludingCurrent = sanitizedMessages.length

  const outsideCutoff = totalIncludingCurrent - CONTEXT_WINDOW

  if (outsideCutoff <= 0) {
    return {
      systemPrompt: baseSystemPrompt,
      recentMessages: trimmedMessages,
    }
  }

  const { data: summaries, error: summaryError } = await supabase
    .from('chat_summaries')
    .select<'level, start_seq, end_seq, summary'>('level, start_seq, end_seq, summary')
    .eq('chat_id', chatId)
    .lte('start_seq', outsideCutoff)
    .order('level', { ascending: false })
    .order('start_seq', { ascending: true })

  if (summaryError) {
    console.error('Failed to load summaries:', summaryError.message)
    return {
      systemPrompt: baseSystemPrompt,
      recentMessages: trimmedMessages,
    }
  }

  const summaryRows = (summaries ?? []) as SummaryRow[]

  const summarySegments =
    summaryRows.length > 0 ? formatSummarySegments(summaryRows) : []

  if (summarySegments.length === 0) {
    return {
      systemPrompt: baseSystemPrompt,
      recentMessages: trimmedMessages,
    }
  }

  const systemPrompt =
    `${baseSystemPrompt.trim()}\n\n=== 이전 대화 요약 ===\n` +
    summarySegments.join('\n\n')

  return {
    systemPrompt,
    recentMessages: trimmedMessages,
  }
}

export async function updateSummaries({
  supabase,
  chatId,
  model,
}: UpdateSummariesOptions): Promise<void> {
  try {
    const totalMessages = await getMessageCount(supabase, chatId)
    if (totalMessages === null || totalMessages < CHUNK_SIZE * 2) {
      return
    }

    const lastProcessedChunkEnd = await getLastSummaryEnd(
      supabase,
      chatId,
      SUMMARY_LEVEL_CHUNK
    )

    await processChunkSummaries({
      supabase,
      chatId,
      model,
      totalMessages,
      previousEnd: lastProcessedChunkEnd ?? 0,
    })

    await processMetaSummaries({
      supabase,
      chatId,
      model,
    })
  } catch (error) {
    console.error('Error updating chat summaries:', error)
  }
}

async function getMessageCount(
  supabase: ServerSupabaseClient,
  chatId: string
): Promise<number | null> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('chat_id', chatId)

  if (error) {
    console.error('Failed to count messages:', error.message)
    return null
  }

  return count ?? 0
}

async function getLastSummaryEnd(
  supabase: ServerSupabaseClient,
  chatId: string,
  level: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('chat_summaries')
    .select('end_seq')
    .eq('chat_id', chatId)
    .eq('level', level)
    .order('end_seq', { ascending: false })
    .limit(1)
    .maybeSingle<{ end_seq: number }>()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Failed to fetch last summary end:', error.message)
    }
    return null
  }

  return data ? data.end_seq : null
}

async function processChunkSummaries({
  supabase,
  chatId,
  model,
  totalMessages,
  previousEnd,
}: {
  supabase: ServerSupabaseClient
  chatId: string
  model: LanguageModel
  totalMessages: number
  previousEnd: number
}) {
  const boundaries = calculateChunkBoundaries(
    totalMessages,
    previousEnd,
    CHUNK_SIZE
  )

  if (boundaries.length === 0) {
    return
  }

  for (const boundary of boundaries) {
    try {
      await createChunkSummary({
        supabase,
        chatId,
        model,
        startSeq: boundary.start,
        endSeq: boundary.end,
      })
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        // Unique constraint hit (double run) - ignore and continue.
      } else {
        console.error('Failed to create chunk summary:', error)
        return
      }
    }
  }
}

async function createChunkSummary({
  supabase,
  chatId,
  model,
  startSeq,
  endSeq,
}: {
  supabase: ServerSupabaseClient
  chatId: string
  model: LanguageModel
  startSeq: number
  endSeq: number
}) {
  const fromIndex = startSeq - 1
  const toIndex = endSeq - 1

  const { data: messages, error: messageError } = await supabase
    .from('messages')
    .select<'role, content'>('role, content')
    .eq('chat_id', chatId)
    .order('sequence', { ascending: true })
    .range(fromIndex, toIndex)

  if (messageError) {
    throw new Error(`Failed to load chunk messages: ${messageError.message}`)
  }

  const chunkMessages = (messages ?? []) as MessageTranscriptRow[]

  if (chunkMessages.length !== CHUNK_SIZE) {
    throw new Error(
      `Expected ${CHUNK_SIZE} messages for chunk but received ${chunkMessages.length}`
    )
  }

  const sanitizedChunk = chunkMessages.map((msg) => ({
    role: msg.role,
    content: truncateText(msg.content, MESSAGE_CHAR_LIMIT),
  })) as MessageTranscriptRow[]

  const formattedTranscript = sanitizedChunk
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n')

  const { summaryText, tokenCount } = await generateSummaryWithFallback({
    model,
    systemPrompt: CHUNK_SUMMARY_SYSTEM_PROMPT,
    prompt: `Summarize the following conversation segment:\n\n${formattedTranscript}`,
    maxTokens: CHUNK_SUMMARY_MAX_TOKENS,
    fallbackLabel: `chunk ${startSeq}-${endSeq}`,
    fallbackTextFactory: () => buildChunkFallbackSummary(sanitizedChunk),
  })

  await supabase
    .from('chat_summaries')
    .insert<ChatSummaryInsert>({
      chat_id: chatId,
      level: SUMMARY_LEVEL_CHUNK,
      start_seq: startSeq,
      end_seq: endSeq,
      summary: summaryText,
      token_count: tokenCount,
    })
}

async function processMetaSummaries({
  supabase,
  chatId,
  model,
}: {
  supabase: ServerSupabaseClient
  chatId: string
  model: LanguageModel
}) {
  let lastMetaEnd =
    (await getLastSummaryEnd(supabase, chatId, SUMMARY_LEVEL_META)) ?? 0

  while (true) {
    const { data: candidateChunks, error: chunkError } = await supabase
      .from('chat_summaries')
      .select<'id, start_seq, end_seq, summary'>('id, start_seq, end_seq, summary')
      .eq('chat_id', chatId)
      .eq('level', SUMMARY_LEVEL_CHUNK)
      .gt('start_seq', lastMetaEnd)
      .order('start_seq', { ascending: true })
      .limit(SUMMARY_GROUP_SIZE)

    if (chunkError) {
      console.error('Failed to load chunk summaries:', chunkError.message)
      return
    }

    const chunkRows = (candidateChunks ?? []) as ChunkSummaryRow[]

    if (chunkRows.length < SUMMARY_GROUP_SIZE) {
      return
    }

    if (!areChunksSequential(chunkRows)) {
      console.warn('Chunk summaries are not sequential; skipping meta summary generation')
      return
    }

    const metaStart = chunkRows[0].start_seq
    const metaEnd = chunkRows[chunkRows.length - 1].end_seq

    try {
      await createMetaSummary({
        supabase,
        chatId,
        model,
        chunks: chunkRows,
        startSeq: metaStart,
        endSeq: metaEnd,
      })
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        // Duplicate meta summary (already created) - safe to stop.
        return
      }
      console.error('Failed to create meta summary:', error)
      return
    }

    lastMetaEnd = metaEnd
  }
}

export function areChunksSequential(chunks: Pick<ChatSummary, 'start_seq' | 'end_seq'>[]): boolean {
  for (let index = 1; index < chunks.length; index += 1) {
    const prev = chunks[index - 1]
    const current = chunks[index]
    if (current.start_seq !== prev.end_seq + 1) {
      return false
    }
  }
  return true
}

async function createMetaSummary({
  supabase,
  chatId,
  model,
  chunks,
  startSeq,
  endSeq,
}: {
  supabase: ServerSupabaseClient
  chatId: string
  model: LanguageModel
  chunks: Array<Pick<ChatSummary, 'start_seq' | 'end_seq' | 'summary'>>
  startSeq: number
  endSeq: number
}) {
  const combinedText = chunks
    .map(
      (chunk) =>
        `Messages ${chunk.start_seq}-${chunk.end_seq}:\n${truncateText(
          chunk.summary.trim(),
          MESSAGE_CHAR_LIMIT
        )}`
    )
    .join('\n\n')

  const { summaryText, tokenCount } = await generateSummaryWithFallback({
    model,
    systemPrompt: META_SUMMARY_SYSTEM_PROMPT,
    prompt: `Create a concise higher-level summary of the following conversation chunks:\n\n${combinedText}`,
    maxTokens: META_SUMMARY_MAX_TOKENS,
    fallbackLabel: `meta ${startSeq}-${endSeq}`,
    fallbackTextFactory: () => buildMetaFallbackSummary(chunks),
  })

  await supabase
    .from('chat_summaries')
    .insert<ChatSummaryInsert>({
      chat_id: chatId,
      level: SUMMARY_LEVEL_META,
      start_seq: startSeq,
      end_seq: endSeq,
      summary: summaryText,
      token_count: tokenCount,
    })
}

interface SummaryWithFallbackOptions {
  model: LanguageModel
  systemPrompt: string
  prompt: string
  maxTokens: number
  fallbackLabel: string
  fallbackTextFactory: () => string
}

async function generateSummaryWithFallback({
  model,
  systemPrompt,
  prompt,
  maxTokens,
  fallbackLabel,
  fallbackTextFactory,
}: SummaryWithFallbackOptions): Promise<{ summaryText: string; tokenCount: number | null }> {
  try {
    const { text, usage } = await generateText({
      model,
      system: systemPrompt,
      prompt,
      maxTokens,
      temperature: 0,
    })
    const summaryText = text.trim()
    if (!summaryText) {
      throw new Error('Empty summary text returned from model')
    }
    return {
      summaryText,
      tokenCount: usage?.completionTokens ?? null,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during summarization'
    console.error(`[summaries] LLM summary failed (${fallbackLabel}) - ${message}`)
    const fallbackText = fallbackTextFactory()
    return {
      summaryText: fallbackText,
      tokenCount: null,
    }
  }
}

function buildChunkFallbackSummary(messages: MessageTranscriptRow[]): string {
  const highlights = messages
    .slice(-FALLBACK_RECENT_MESSAGES)
    .map((msg) => {
      const speaker = msg.role === 'user' ? '사용자' : 'AI'
      return `${speaker}: ${truncateText(msg.content, 140)}`
    })

  const summary = `요약 실패 – 최근 대화 하이라이트:\n- ${highlights.join('\n- ')}`
  return truncateText(summary, FALLBACK_SUMMARY_CHAR_LIMIT)
}

function buildMetaFallbackSummary(
  chunks: Array<Pick<ChatSummary, 'start_seq' | 'end_seq' | 'summary'>>
): string {
  const lines = chunks.map((chunk) => {
    const range = `${chunk.start_seq}-${chunk.end_seq}`
    return `[${range}] ${truncateText(chunk.summary, 160)}`
  })

  const summary = `요약 실패 – 기존 청크 요약을 그대로 참조하세요:\n${lines.join('\n')}`
  return truncateText(summary, FALLBACK_SUMMARY_CHAR_LIMIT)
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return `${text.slice(0, maxLength - 1).trimEnd()}…`
}

export const SUMMARY_CONFIG = {
  CONTEXT_WINDOW,
  CHUNK_SIZE,
  SUMMARY_GROUP_SIZE,
  SUMMARY_LEVEL_CHUNK,
  SUMMARY_LEVEL_META,
} as const
