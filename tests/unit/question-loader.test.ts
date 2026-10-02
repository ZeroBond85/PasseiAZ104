import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureSeeded, getBankLine } from '../../src/data/QuestionLoader.js'
import { questionsCount, seedQuestions } from '../../src/sync/IndexedDB.js'

vi.mock('../../src/sync/IndexedDB.js', () => ({
  loadAllQuestions: vi.fn(),
  questionsCount: vi.fn(),
  seedQuestions: vi.fn(),
}))

const VERSION_KEY = 'az104-seed-version'

const validQ = {
  id: 'az104-ig-001',
  domain: 'identidade-governanca',
  subdomain: 'entra-id',
  type: 'single',
  difficulty: 'medium',
  question:
    'Questão de teste com mais de cinquenta caracteres para valer de verdade.',
  options: [
    { letter: 'A', text: 'a' },
    { letter: 'B', text: 'b' },
    { letter: 'C', text: 'c' },
    { letter: 'D', text: 'd' },
  ],
  correct: ['A'],
  explanation:
    'Explicação de teste deliberadamente longa, com bem mais de cem caracteres, para satisfazer o mínimo exigido pelo schema Zod sem ambiguidade.',
  source: 'original',
  createdAt: '2026-09-12T00:00:00.000Z',
  updatedAt: '2026-09-12T00:00:00.000Z',
}

// RPR (LESSONS 2026-09-25): 1 arquivo falhando marcava seed completo,
// deixando o usuário com um domínio faltando para sempre.
describe('QuestionLoader.ensureSeeded', () => {
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.mocked(questionsCount).mockResolvedValue(0)
    vi.mocked(seedQuestions).mockResolvedValue(undefined)
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
  })

  it('falha parcial (7/8) lança erro e NÃO marca seed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('rede-virtual.json'))
          return { ok: false, status: 500 }
        return { ok: true, json: async () => [validQ] }
      }),
    )
    await expect(ensureSeeded()).rejects.toThrow(/seed parcial: 7\/8/)
    expect(store.has(VERSION_KEY)).toBe(false)
  })

  it('falha de rede (throw) também lança erro e NÃO marca seed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('storage.json'))
          throw new Error('network down')
        return { ok: true, json: async () => [validQ] }
      }),
    )
    await expect(ensureSeeded()).rejects.toThrow(/seed parcial: 7\/8/)
    expect(store.has(VERSION_KEY)).toBe(false)
  })

  it('8/8 OK marca seed e retorna contagem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [validQ] })),
    )
    const r = await ensureSeeded()
    expect(r).toEqual({ seeded: true, count: 8 })
    expect(store.get(VERSION_KEY)).toBe('2')
  })

  it('versão antiga no storage (v1) força re-seed na v2', async () => {
    vi.mocked(seedQuestions).mockClear()
    store.set(VERSION_KEY, '1')
    vi.mocked(questionsCount).mockResolvedValue(950)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [validQ] })),
    )
    const r = await ensureSeeded()
    expect(r.seeded).toBe(true)
    expect(store.get(VERSION_KEY)).toBe('2')
    expect(vi.mocked(seedQuestions)).toHaveBeenCalled()
  })

  it('versão atual (v2) com IDB populado pula o seed', async () => {
    vi.mocked(seedQuestions).mockClear()
    store.set(VERSION_KEY, '2')
    vi.mocked(questionsCount).mockResolvedValue(1000)
    const r = await ensureSeeded()
    expect(r).toEqual({ seeded: false, count: 1000 })
    expect(vi.mocked(seedQuestions)).not.toHaveBeenCalled()
  })
})

describe('QuestionLoader.getBankLine', () => {
  const store = new Map<string, string>()
  const metaQ = {
    ok: true,
    json: async () => ({
      countsByDomain: { a: 500, b: 500 },
      updatedAt: '2026-09-27T00:00:00.000Z',
    }),
  }

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => metaQ),
    )
  })

  it('anuncia o total quando semeado == meta.total', async () => {
    vi.mocked(questionsCount).mockResolvedValue(1000)
    const line = await getBankLine()
    expect(line).toContain('1000 questões')
  })

  it('não anuncia quando semeado < meta.total', async () => {
    vi.mocked(questionsCount).mockResolvedValue(500)
    await expect(getBankLine()).resolves.toBe('')
  })

  it('não anuncia quando IDB vazio', async () => {
    vi.mocked(questionsCount).mockResolvedValue(0)
    await expect(getBankLine()).resolves.toBe('')
  })
})
