import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'

const hoistedMocks = vi.hoisted(() => {
  const buildContextMock = vi.fn()
  const updateSummariesMock = vi.fn()
  const streamTextMock = vi.fn()
  const createClientMock = vi.fn()
  const createAdminClientMock = vi.fn()

  return {
    buildContextMock,
    updateSummariesMock,
    streamTextMock,
    createClientMock,
    createAdminClientMock,
    aiModuleFactory: async () => {
      const actual = (await vi.importActual<typeof import('ai')>('ai')) ?? {}
      return {
        ...actual,
        streamText: streamTextMock,
      }
    },
    chatSummariesModuleFactory: () => ({
      buildContext: buildContextMock,
      updateSummaries: updateSummariesMock,
    }),
  }
})

type SanitizedMessage = { role: 'user' | 'assistant'; content: string }

type BuildContextArgs = [
  {
    supabase: unknown
    chatId: string
    sanitizedMessages: SanitizedMessage[]
    baseSystemPrompt: string
  }
]
type BuildContextReturn = Promise<{
  systemPrompt: string
  recentMessages: SanitizedMessage[]
}>

const buildContextMock = hoistedMocks.buildContextMock as Mock<
  BuildContextReturn,
  BuildContextArgs
>

type UpdateSummariesArgs = [
  {
    supabase: unknown
    chatId: string
    model: unknown
  }
]

const updateSummariesMock = hoistedMocks.updateSummariesMock as Mock<
  Promise<void>,
  UpdateSummariesArgs
>

vi.mock('@/lib/chat-summaries', hoistedMocks.chatSummariesModuleFactory)

const streamTextMock = hoistedMocks.streamTextMock

vi.mock('ai', hoistedMocks.aiModuleFactory)

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: () => () => ({ id: 'google-model' }),
}))

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => () => ({ id: 'openai-model' }),
}))

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: () => () => ({ id: 'anthropic-model' }),
}))

const createClientMock = hoistedMocks.createClientMock
const createAdminClientMock = hoistedMocks.createAdminClientMock

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}))

import { POST } from './route'

interface ApiKeyRow {
  id: string
  user_id: string
  provider: 'google' | 'openai' | 'anthropic'
  is_active: boolean
  vault_secret_name: string
  model_preference: string | null
}

interface ChatRow {
  id: string
  user_id: string
  character_id: string
  max_context_messages: number
}

interface CharacterRow {
  id: string
  system_prompt: string
}

interface MessageInsertRow {
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  model_used?: string | null
  prompt_tokens?: number | null
  completion_tokens?: number | null
  error_code?: string | null
}

interface ChatUsageEventInsertRow {
  user_id: string
  chat_id: string
  api_key_id: string
  model_provider: string
  model_name: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  request_id: string
}

interface SupabaseFixture {
  user: { id: string } | null
  apiKeys: ApiKeyRow[]
  chats: ChatRow[]
  characters: CharacterRow[]
  decryptedSecret?: string
  rateLimit?: {
    allowed: boolean
    retryAfter?: number
    error?: { message: string; code?: string | null }
  }
  anonRateLimit?: {
    allowed: boolean
    retryAfter?: number
    error?: { message: string; code?: string | null }
  }
}

class SupabaseRouteMock {
  constructor(fixture: SupabaseFixture) {
    this.fixture = fixture
  }

  private readonly fixture: SupabaseFixture
  readonly messages: MessageInsertRow[] = []

  auth = {
    getUser: async () => ({
      data: { user: this.fixture.user },
    }),
  }

  from(table: string) {
    switch (table) {
      case 'api_keys':
        return new ApiKeysTable(this.fixture.apiKeys)
      case 'chats':
        return new ChatsTable(this.fixture.chats)
      case 'characters':
        return new CharactersTable(this.fixture.characters)
      case 'messages':
        return new MessagesTable(this.messages)
      default:
        throw new Error(`Unsupported table: ${table}`)
    }
  }
}

class SupabaseAdminMock {
  constructor(private readonly fixture: SupabaseFixture) {}

  readonly usageEvents: ChatUsageEventInsertRow[] = []

  rpc(name: string, params: Record<string, unknown>) {
    switch (name) {
      case 'check_anon_rate_limit': {
        if (this.fixture.anonRateLimit?.error) {
          return Promise.resolve({
            data: null,
            error: this.fixture.anonRateLimit.error,
          })
        }

        const allowed = this.fixture.anonRateLimit?.allowed ?? true
        const retryAfter = this.fixture.anonRateLimit?.retryAfter ?? 0
        const remaining = allowed ? 1 : 0

        return Promise.resolve({
          data: [
            {
              allowed,
              remaining,
              retry_after: retryAfter,
            },
          ],
          error: null,
        })
      }
      case 'get_decrypted_secret': {
        const requester = params.requester
        const expectedUserId = this.fixture.user?.id
        if (!expectedUserId || requester !== expectedUserId) {
          return Promise.resolve({
            data: null,
            error: { message: 'Not authorized' },
          })
        }

        const secret =
          this.fixture.decryptedSecret ??
          `decrypted-${String(params.secret_name ?? '')}`

        return Promise.resolve({ data: secret, error: null })
      }
      case 'check_chat_rate_limit': {
        if (this.fixture.rateLimit?.error) {
          return Promise.resolve({
            data: null,
            error: this.fixture.rateLimit.error,
          })
        }

        const allowed = this.fixture.rateLimit?.allowed ?? true
        const retryAfter = this.fixture.rateLimit?.retryAfter ?? 0
        const remaining = allowed ? 1 : 0

        return Promise.resolve({
          data: [
            {
              allowed,
              remaining,
              retry_after: retryAfter,
            },
          ],
          error: null,
        })
      }
      default:
        throw new Error(`Unsupported admin RPC: ${name}`)
    }
  }

  from(table: string) {
    if (table !== 'chat_usage_events') {
      throw new Error(`Unsupported admin table: ${table}`)
    }

    return {
      insert: async (rows: ChatUsageEventInsertRow | ChatUsageEventInsertRow[]) => {
        const payload = Array.isArray(rows) ? rows : [rows]
        this.usageEvents.push(...payload)
        return { data: payload, error: null }
      },
    }
  }
}

type Predicate<T> = (row: T) => boolean

class ApiKeysTable {
  constructor(private readonly rows: ApiKeyRow[]) {}

  select() {
    const filters: Predicate<ApiKeyRow>[] = []
    const builder = {
      eq: (field: keyof ApiKeyRow, value: unknown) => {
        filters.push((row) => row[field] === value)
        return builder
      },
      single: async () => {
        const row = this.rows.find((candidate) =>
          filters.every((predicate) => predicate(candidate))
        )
        if (!row) {
          return { data: null, error: { message: 'Not found' } }
        }
        return { data: { ...row }, error: null }
      },
    }
    return builder
  }

  update(values: Partial<ApiKeyRow>) {
    const filters: Predicate<ApiKeyRow>[] = []
    const builder = {
      eq: (field: keyof ApiKeyRow, value: unknown) => {
        filters.push((row) => row[field] === value)
        return builder
      },
      then: <TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: { data: ApiKeyRow[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
      ) => {
        const targets = this.rows.filter((candidate) =>
          filters.every((predicate) => predicate(candidate))
        )
        targets.forEach((row) => Object.assign(row, values))
        return Promise.resolve({ data: targets, error: null }).then(onfulfilled, onrejected)
      },
    }
    return builder
  }
}

class ChatsTable {
  constructor(private readonly rows: ChatRow[]) {}

  select() {
    const filters: Predicate<ChatRow>[] = []
    const builder = {
      eq: (field: keyof ChatRow, value: unknown) => {
        filters.push((row) => row[field] === value)
        return builder
      },
      single: async () => {
        const row = this.rows.find((candidate) =>
          filters.every((predicate) => predicate(candidate))
        )
        if (!row) {
          return { data: null, error: { message: 'Not found' } }
        }
        return { data: { ...row }, error: null }
      },
    }
    return builder
  }
}

class CharactersTable {
  constructor(private readonly rows: CharacterRow[]) {}

  select() {
    const filters: Predicate<CharacterRow>[] = []
    const builder = {
      eq: (field: keyof CharacterRow, value: unknown) => {
        filters.push((row) => row[field] === value)
        return builder
      },
      single: async () => {
        const row = this.rows.find((candidate) =>
          filters.every((predicate) => predicate(candidate))
        )
        if (!row) {
          return { data: null, error: { message: 'Not found' } }
        }
        return { data: { ...row }, error: null }
      },
    }
    return builder
  }
}

class MessagesTable {
  constructor(private readonly rows: MessageInsertRow[]) {}

  async insert(payload: MessageInsertRow | MessageInsertRow[]) {
    const records = Array.isArray(payload) ? payload : [payload]
    records.forEach((record) => {
      this.rows.push({
        chat_id: record.chat_id,
        role: record.role,
        content: record.content,
        model_used: record.model_used ?? null,
        prompt_tokens: record.prompt_tokens ?? null,
        completion_tokens: record.completion_tokens ?? null,
        error_code: record.error_code ?? null,
      })
    })
    return { data: records, error: null }
  }
}

function createSupabaseMock(
  fixture: SupabaseFixture
): SupabaseRouteMock & { adminUsageEvents: ChatUsageEventInsertRow[] } {
  const routeMock = new SupabaseRouteMock(fixture)
  const adminMock = new SupabaseAdminMock(fixture)
  createClientMock.mockReturnValue(routeMock)
  createAdminClientMock.mockReturnValue(adminMock)
  ;(routeMock as SupabaseRouteMock & {
    adminUsageEvents: ChatUsageEventInsertRow[]
  }).adminUsageEvents = adminMock.usageEvents
  return routeMock as SupabaseRouteMock & {
    adminUsageEvents: ChatUsageEventInsertRow[]
  }
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    buildContextMock.mockReset()
    updateSummariesMock.mockReset()
    streamTextMock.mockReset()
    createClientMock.mockReset()
    createAdminClientMock.mockReset()

    buildContextMock.mockImplementation(async ({ sanitizedMessages }) => ({
      systemPrompt: 'SYSTEM PROMPT',
      recentMessages: sanitizedMessages.slice(-2),
    }))

    updateSummariesMock.mockResolvedValue()

    streamTextMock.mockImplementation(async ({ onFinish }) => {
      if (onFinish) {
        await onFinish({
          text: 'assistant reply',
          usage: { promptTokens: 11, completionTokens: 22, totalTokens: 33 },
          finishReason: 'stop',
          experimental_providerMetadata: undefined,
        })
      }
      return {
        toAIStreamResponse() {
          return new Response('streamed response', { status: 200 })
        },
      }
    })
  })

  it('returns 401 for anonymous users when the rate limit allows the request', async () => {
    createSupabaseMock({
      user: null,
      apiKeys: [],
      chats: [],
      characters: [],
      anonRateLimit: {
        allowed: true,
      },
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-anon',
        apiKeyId: 'anon-key',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 429 when anonymous rate limit is exceeded', async () => {
    createSupabaseMock({
      user: null,
      apiKeys: [],
      chats: [],
      characters: [],
      anonRateLimit: {
        allowed: false,
        retryAfter: 17,
      },
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-anon',
        apiKeyId: 'anon-key',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('17')
    const payload = await response.json()
    expect(payload).toMatchObject({
      error: 'Too many requests',
      retryAfter: 17,
    })
  })

  it('returns 500 when anonymous rate limiter RPC fails', async () => {
    createSupabaseMock({
      user: null,
      apiKeys: [],
      chats: [],
      characters: [],
      anonRateLimit: {
        allowed: true,
        error: { message: 'db down', code: 'XX001' },
      },
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-anon',
        apiKeyId: 'anon-key',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('enforces chat ownership and returns 404 when chat is missing', async () => {
    createSupabaseMock({
      user: { id: 'user-1' },
      apiKeys: [
        {
          id: 'api-key-1',
          user_id: 'user-1',
          provider: 'google',
          is_active: true,
          vault_secret_name: 'secret-key',
          model_preference: 'gemini-2.5-flash',
        },
      ],
      chats: [
        {
          id: 'chat-other',
          user_id: 'user-2',
          character_id: 'character-1',
          max_context_messages: 20,
        },
      ],
      characters: [
        {
          id: 'character-1',
          system_prompt: 'base prompt',
        },
      ],
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-1',
        apiKeyId: 'api-key-1',
        messages: [{ role: 'user', content: '안녕' }],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
    expect(updateSummariesMock).not.toHaveBeenCalled()
  })

  it('stores messages, updates usage metadata, and triggers summaries when request is valid', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'user-1' },
      apiKeys: [
        {
          id: 'api-key-1',
          user_id: 'user-1',
          provider: 'google',
          is_active: true,
          vault_secret_name: 'secret-key',
          model_preference: 'gemini-2.5-flash',
        },
      ],
      chats: [
        {
          id: 'chat-1',
          user_id: 'user-1',
          character_id: 'character-1',
          max_context_messages: 20,
        },
      ],
      characters: [
        {
          id: 'character-1',
          system_prompt: 'character system prompt',
        },
      ],
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-1',
        apiKeyId: 'api-key-1',
        messages: [
          { role: 'system', content: 'ignored' },
          { role: 'assistant', content: 'previous answer' },
          { role: 'user', content: '최신 질문' },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('streamed response')

    expect(buildContextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'chat-1',
        baseSystemPrompt: 'character system prompt',
      })
    )

    const sanitizedMessages = buildContextMock.mock.calls[0][0].sanitizedMessages
    expect(sanitizedMessages).toEqual([
      { role: 'assistant', content: 'previous answer' },
      { role: 'user', content: '최신 질문' },
    ])

    expect(supabase.messages).toHaveLength(2)
    expect(supabase.messages[0]).toMatchObject({
      role: 'user',
      content: '최신 질문',
    })
    expect(supabase.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'assistant reply',
      prompt_tokens: 11,
      completion_tokens: 22,
      model_used: 'gemini-2.5-flash',
    })

    expect(updateSummariesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 'chat-1',
      })
    )

    expect(supabase.adminUsageEvents).toHaveLength(1)
    expect(supabase.adminUsageEvents[0]).toMatchObject({
      user_id: 'user-1',
      chat_id: 'chat-1',
      api_key_id: 'api-key-1',
      model_provider: 'google',
      model_name: 'gemini-2.5-flash',
      prompt_tokens: 11,
      completion_tokens: 22,
      total_tokens: 33,
    })
  })

  it('returns 429 when user rate limit is exceeded', async () => {
    createSupabaseMock({
      user: { id: 'user-1' },
      apiKeys: [
        {
          id: 'api-key-1',
          user_id: 'user-1',
          provider: 'google',
          is_active: true,
          vault_secret_name: 'secret-key',
          model_preference: 'gemini-2.5-flash',
        },
      ],
      chats: [
        {
          id: 'chat-1',
          user_id: 'user-1',
          character_id: 'character-1',
          max_context_messages: 20,
        },
      ],
      characters: [
        {
          id: 'character-1',
          system_prompt: 'character system prompt',
        },
      ],
      rateLimit: {
        allowed: false,
        retryAfter: 12,
      },
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-1',
        apiKeyId: 'api-key-1',
        messages: [{ role: 'user', content: 'rate limit me' }],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    const payload = await response.json()
    expect(payload).toMatchObject({
      error: 'Rate limit exceeded',
      retryAfter: 12,
    })
  })

  it('fails with 500 when rate limiter RPC errors', async () => {
    createSupabaseMock({
      user: { id: 'user-1' },
      apiKeys: [
        {
          id: 'api-key-1',
          user_id: 'user-1',
          provider: 'google',
          is_active: true,
          vault_secret_name: 'secret-key',
          model_preference: 'gemini-2.5-flash',
        },
      ],
      chats: [
        {
          id: 'chat-1',
          user_id: 'user-1',
          character_id: 'character-1',
          max_context_messages: 20,
        },
      ],
      characters: [
        {
          id: 'character-1',
          system_prompt: 'character system prompt',
        },
      ],
      rateLimit: {
        allowed: true,
        error: { message: 'db down', code: 'XX001' },
      },
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-1',
        apiKeyId: 'api-key-1',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('returns a descriptive error when the provider blocks the response', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'user-1' },
      apiKeys: [
        {
          id: 'api-key-1',
          user_id: 'user-1',
          provider: 'google',
          is_active: true,
          vault_secret_name: 'secret-key',
          model_preference: 'gemini-2.5-flash',
        },
      ],
      chats: [
        {
          id: 'chat-1',
          user_id: 'user-1',
          character_id: 'character-1',
          max_context_messages: 20,
        },
      ],
      characters: [
        {
          id: 'character-1',
          system_prompt: 'character system prompt',
        },
      ],
    })

    streamTextMock.mockImplementationOnce(async ({ onFinish }) => {
      if (onFinish) {
        await onFinish({
          text: '',
          usage: undefined,
          finishReason: 'content-filter',
          experimental_providerMetadata: {
            google: {
              safetyRatings: [
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  blocked: true,
                },
              ],
            },
          },
        })
      }
      return {
        toAIStreamResponse() {
          return new Response('unexpected stream', { status: 200 })
        },
      }
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-1',
        apiKeyId: 'api-key-1',
        messages: [{ role: 'user', content: '금지된 프롬프트' }],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(409)
    const body = await response.text()
    expect(body).toContain('Google Gemini 검열에 의해 차단되었습니다')
    expect(body).toContain('dangerous content')

    expect(supabase.messages).toHaveLength(2)
    expect(supabase.messages[0]).toMatchObject({
      role: 'user',
      content: '금지된 프롬프트',
      error_code: null,
    })
    expect(supabase.messages[1]).toMatchObject({
      role: 'system',
      error_code: 'GOOGLE_CONTENT_FILTER',
    })

    expect(updateSummariesMock).not.toHaveBeenCalled()
  })

  it('treats empty Google responses as filtered output', async () => {
    const supabase = createSupabaseMock({
      user: { id: 'user-1' },
      apiKeys: [
        {
          id: 'api-key-1',
          user_id: 'user-1',
          provider: 'google',
          is_active: true,
          vault_secret_name: 'secret-key',
          model_preference: 'gemini-2.5-flash',
        },
      ],
      chats: [
        {
          id: 'chat-1',
          user_id: 'user-1',
          character_id: 'character-1',
          max_context_messages: 20,
        },
      ],
      characters: [
        {
          id: 'character-1',
          system_prompt: 'system prompt',
        },
      ],
    })

    streamTextMock.mockImplementationOnce(async ({ onFinish }) => {
      if (onFinish) {
        await onFinish({
          text: '',
          usage: undefined,
          finishReason: 'unknown',
          experimental_providerMetadata: undefined,
        })
      }
      return {
        toAIStreamResponse() {
          return new Response('unexpected stream', { status: 200 })
        },
      }
    })

    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        chatId: 'chat-1',
        apiKeyId: 'api-key-1',
        messages: [{ role: 'user', content: '무응답 테스트' }],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(409)
    const body = await response.text()
    expect(body).toContain('Google Gemini 검열에 의해 차단되었습니다')

    expect(supabase.messages).toHaveLength(2)
    expect(supabase.messages[0]).toMatchObject({
      role: 'user',
      content: '무응답 테스트',
      error_code: null,
    })
    expect(supabase.messages[1]).toMatchObject({
      role: 'system',
      error_code: 'GOOGLE_CONTENT_FILTER',
    })

    expect(updateSummariesMock).not.toHaveBeenCalled()
  })
})
