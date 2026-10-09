import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pushPlatform } from '../../src/sync/SyncEngine.js'

type Attempt = {
  id: string
  kind: 'simulado'
  simuladoId: string
  startedAt: number
  finishedAt: number
  durationSeconds: number
  questions: number
  score: number
  passed: boolean
  answers: []
  byDomain: Record<string, unknown>
  errorTags: Record<string, unknown>
  scoringModelVersion: number
  createdAt: number
}

const h = vi.hoisted(() => ({
  attempts: [] as Attempt[],
  upserts: [] as {
    table: string
    payload: unknown
    options?: unknown
  }[],
  delayMs: 40,
}))

vi.mock('../../src/sync/supabase.js', () => ({
  isSyncEnabled: () => true,
  supabase: {
    from: (table: string) => ({
      upsert: async (payload: unknown, options?: unknown) => {
        await new Promise((resolve) => setTimeout(resolve, h.delayMs))
        h.upserts.push({ table, payload, options })
        return { error: null }
      },
    }),
  },
}))

vi.mock('../../src/sync/IndexedDB.js', () => ({
  loadAttemptsForUser: async () => h.attempts,
  loadDoubtsForUser: async () => [],
  loadActivityForUser: async () => [],
  loadAllSuggestions: async () => [],
}))

function attempt(id: string): Attempt {
  return {
    id,
    kind: 'simulado',
    simuladoId: 'sim-oficial-01',
    startedAt: 1,
    finishedAt: 2,
    durationSeconds: 60,
    questions: 50,
    score: 700,
    passed: true,
    answers: [],
    byDomain: {},
    errorTags: {},
    scoringModelVersion: 2,
    createdAt: 2,
  }
}

describe('Gate 3.1 — batch upsert', () => {
  beforeEach(() => {
    h.attempts = []
    h.upserts.length = 0
    h.delayMs = 40
  })

  it('50 tentativas saem em um lote e em menos de 1s', async () => {
    h.attempts = Array.from({ length: 50 }, (_, i) => attempt(`a-${i}`))
    const started = Date.now()
    const result = await pushPlatform('u1')
    const elapsed = Date.now() - started

    expect(result).toMatchObject({ pushed: 50, failed: 0 })
    const attemptsUpserts = h.upserts.filter(
      (u) => u.table === 'az104_attempts',
    )
    expect(attemptsUpserts).toHaveLength(1)
    expect(attemptsUpserts[0].payload).toHaveLength(50)
    expect(elapsed).toBeLessThan(1000)
  })

  it('divide lotes grandes em chunks de 100', async () => {
    h.delayMs = 0
    h.attempts = Array.from({ length: 250 }, (_, i) => attempt(`a-${i}`))
    const result = await pushPlatform('u1')
    const payloads = h.upserts
      .filter((u) => u.table === 'az104_attempts')
      .map((u) => u.payload as unknown[])

    expect(result.pushed).toBe(250)
    expect(payloads.map((payload) => payload.length)).toEqual([100, 100, 50])
  })
})
