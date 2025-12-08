import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Configurable Mock Gemini helpers to avoid real network calls
vi.mock('../lib/gemini', () => {
  let ensureOk = true
  let ensureErr: string | null = null
  return {
    __setEnsure: (ok: boolean, err?: string) => { ensureOk = ok; ensureErr = err ?? null },
    ensureVerified: vi.fn(async () => ({ ok: ensureOk, error: ensureErr, model: 'gemini-2.5-flash' })),
    getGeminiModel: vi.fn(() => ({
      generateContent: async (_prompt: string) => ({ response: { text: () => 'stubbed reply' } }),
    })),
    generateTextStream: vi.fn(async function* (_prompt: string) {
      yield 'hello '
      yield 'world'
    }),
  }
})

// Configurable Mock Supabase helpers to ensure no network and support both anonymous and authenticated flows
vi.mock('../lib/supabase', () => {
  let mockUser: any = null
  let recentCount = 0
  const insertedMessages: any[] = []
  let createdConsultationId = 'test-consult-123'

  function makeClient() {
    return {
      auth: { getUser: async () => ({ data: { user: mockUser } }) },
      from: (table: string) => {
        if (table === 'consultation_messages') {
          return {
            // Chained usage: select(...).eq(...).gte(...) => { count }
            select: (_cols?: any, _opts?: any) => ({
              eq: (_col: string, _val: any) => ({
                gte: (_col2: string, _val2: any) => ({ count: recentCount }),
              }),
            }),
            // Also support standalone eq/gte + final select for alternative patterns
            eq: (_col: string, _val: any) => ({
              gte: (_col2: string, _val2: any) => ({ select: (_c?: any, _o?: any) => ({ count: recentCount }) }),
            }),
            gte: (_col: string, _val: any) => ({ select: (_c?: any, _o?: any) => ({ count: recentCount }) }),
            insert: async (vals: any) => { insertedMessages.push(vals); return { data: null, error: null } },
          }
        }
        if (table === 'consultations') {
          return {
            insert: (_vals: any) => ({
              select: (_cols?: any) => ({
                maybeSingle: async () => ({ data: { id: createdConsultationId }, error: null }),
              }),
            }),
          }
        }
        return {
          insert: async (_vals: any) => ({ data: null, error: null }),
          select: (_cols?: any, _opts?: any) => ({ count: 0 }),
        }
      },
    }
  }

  return {
    __setMockUser: (u: any) => { mockUser = u },
    __setRecentCount: (c: number) => { recentCount = c },
    __resetMessages: () => { insertedMessages.length = 0 },
    __getInsertedMessages: () => [...insertedMessages],
    __setCreatedConsultationId: (id: string) => { createdConsultationId = id },
    supabaseServerWithAuth: vi.fn((_token: string | undefined, _cookies: any) => makeClient()),
    supabaseServer: vi.fn((_cookies: any) => makeClient()),
  }
})

// Import route handlers using relative path (avoids tsconfig path mapping needs)
import * as chatRoute from '../app/api/chat/route'
import * as GeminiMod from '../lib/gemini'
import * as SupabaseMod from '../lib/supabase'

const __setEnsure: (ok: boolean, err?: string) => void = (GeminiMod as any).__setEnsure
const __setMockUser = (SupabaseMod as any).__setMockUser
const __setRecentCount = (SupabaseMod as any).__setRecentCount
const __resetMessages = (SupabaseMod as any).__resetMessages
const __getInsertedMessages = (SupabaseMod as any).__getInsertedMessages
const __setCreatedConsultationId = (SupabaseMod as any).__setCreatedConsultationId

function makeRequest(body?: any, headers?: Record<string,string>) {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  }
  return new Request('http://localhost/api/chat', init)
}

beforeEach(() => {
  // Reset verification to success by default for each test
  __setEnsure(true)
  // Reset supabase mock defaults
  __setMockUser(null)
  __setRecentCount(0)
  __resetMessages()
  __setCreatedConsultationId('test-consult-123')
})

afterEach(() => {
  // Ensure mocks are restored between tests
  vi.restoreAllMocks()
})

describe('/api/chat', () => {
  it('rejects invalid body', async () => {
    const req = makeRequest({})
    const res = await chatRoute.POST(req)
    expect(res.status).toBe(400)
  })

  it('responds non-streaming when stream=false', async () => {
    const req = makeRequest({ messages: [{ role: 'user', content: 'Hello' }], stream: false })
    const res = await chatRoute.POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('reply')
    expect(typeof data.reply).toBe('string')
  })

  it('responds streaming when stream=true and includes delta and final events', async () => {
    const req = makeRequest({ messages: [{ role: 'user', content: 'Stream please' }], stream: true })
    const res = await chatRoute.POST(req)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')
    const text = await res.text()
    const lines = text.trim().split('\n').map((l) => JSON.parse(l))
    const deltas = lines.filter((l: any) => l.type === 'delta').map((l: any) => l.delta)
    const final = lines.find((l: any) => l.type === 'final')
    expect(deltas).toEqual(['hello ', 'world'])
    expect(final.reply).toBe('hello world')
  })

  it('returns 500 when Gemini verification fails', async () => {
    __setEnsure(false, 'no api key')
    const req = makeRequest({ messages: [{ role: 'user', content: 'Hi' }], stream: false })
    const res = await chatRoute.POST(req)
    expect(res.status).toBe(500)
  })

  it('persists messages and returns consultation_id for authenticated user (non-streaming)', async () => {
    __setMockUser({ id: 'user-1' })
    __setRecentCount(0)
    __setCreatedConsultationId('c1')
    const req = makeRequest({ messages: [{ role: 'user', content: 'Symptoms...' }], stream: false }, { authorization: 'Bearer token' })
    const res = await chatRoute.POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.consultation_id).toBe('c1')
    const msgs = __getInsertedMessages() as any[]
    expect(msgs.some((m: any) => m.role === 'user')).toBe(true)
    expect(msgs.some((m: any) => m.role === 'assistant')).toBe(true)
  })

  it('enforces rate limit for authenticated user', async () => {
    __setMockUser({ id: 'user-1' })
    __setRecentCount(999)
    const req = makeRequest({ messages: [{ role: 'user', content: 'Too many' }], stream: false }, { authorization: 'Bearer token' })
    const res = await chatRoute.POST(req)
    expect(res.status).toBe(429)
  })

  it('enforces rate limit for anonymous users by IP', async () => {
    // Use a unique IP to avoid interference with other tests
    const headers = { 'x-forwarded-for': '9.8.7.6' }
    let lastStatus = 200
    for (let i = 0; i < 11; i++) {
      const req = makeRequest({ messages: [{ role: 'user', content: 'Anon msg ' + i }], stream: false }, headers)
      const res = await chatRoute.POST(req)
      lastStatus = res.status
    }
    expect(lastStatus).toBe(429)
  })
})