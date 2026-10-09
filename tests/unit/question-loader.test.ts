import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureSeeded,
  getBankLine,
  getCaseStudy,
} from '../../src/data/QuestionLoader.js'
import { questionsCount, seedQuestions } from '../../src/sync/IndexedDB.js'

// Os casos "falha parcial" e "falha de rede" provocam logger.warn de propósito.
// console.warn vai para stderr e polui o relatório, escondendo erro real.
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

afterAll(() => {
  vi.restoreAllMocks()
})

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
        if (String(url).includes('rede-dns-lb.json'))
          return { ok: false, status: 500 }
        return { ok: true, json: async () => [validQ] }
      }),
    )
    await expect(ensureSeeded()).rejects.toThrow(/seed parcial: 11\/12/)
    expect(store.has(VERSION_KEY)).toBe(false)
  })

  it('falha de rede (throw) também lança erro e NÃO marca seed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('storage-accounts.json'))
          throw new Error('network down')
        return { ok: true, json: async () => [validQ] }
      }),
    )
    await expect(ensureSeeded()).rejects.toThrow(/seed parcial: 11\/12/)
    expect(store.has(VERSION_KEY)).toBe(false)
  })

  it('8/8 OK marca seed e retorna contagem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => [validQ] })),
    )
    const r = await ensureSeeded()
    expect(r).toEqual({ seeded: true, count: 12 })
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

describe('QuestionLoader.getCaseStudy', () => {
  it('resolve o cenário real da Contoso e ignora id desconhecido', () => {
    const caso = getCaseStudy('case-st-01')
    expect(caso?.title).toBe('Migração de arquivos da Contoso')
    expect(caso?.scenario).toContain('40 TB')
    expect(getCaseStudy('caso-inexistente')).toBeUndefined()
    expect(getCaseStudy(undefined)).toBeUndefined()
  })

  it('az104-st-054 é uma questão independente, não um item de cenário', async () => {
    const raw = await readFile(
      new URL('../../data/storage-accounts.json', import.meta.url),
      'utf8',
    )
    const st054 = (JSON.parse(raw) as { id?: string }[]).find(
      (q): q is { id: string } & Record<string, unknown> =>
        q.id === 'az104-st-054',
    )
    expect(st054?.type).toBe('single')
    expect(st054).not.toHaveProperty('caseStudyId')
    expect(st054?.question).not.toMatch(/^Caso (Contoso|Fabrikam):/)
  })

  it('todo item de cenário começa com o cenário correspondente', async () => {
    const cases = JSON.parse(
      await readFile(
        new URL('../../data/case-studies.json', import.meta.url),
        'utf8',
      ),
    ) as { id: string; title: string }[]
    const orgByCase = new Map(
      cases.map((c) => [
        c.id,
        c.title.includes('Contoso') ? 'Contoso' : 'Fabrikam',
      ]),
    )
    const dataDir = new URL('../../data/', import.meta.url)
    const skip = new Set([
      'simulados.json',
      'meta.json',
      'case-studies.json',
      'study-topics.json',
      'exam-syllabus.json',
      'exam-skills.json',
      'grounding-map.json',
      'anchor-map.json',
      'retire_autoeval_ids.json',
      '.generation-state.json',
    ])
    const semCenario: string[] = []
    for (const file of readdirSync(dataDir).filter(
      (f) => f.endsWith('.json') && !skip.has(f),
    )) {
      const banco = JSON.parse(
        await readFile(new URL(file, dataDir), 'utf8'),
      ) as {
        id?: string
        type?: string
        caseStudyId?: string
        question?: string
      }[]
      if (!Array.isArray(banco)) continue
      for (const q of banco) {
        if (q.type !== 'case-study') continue
        const org = orgByCase.get(q.caseStudyId ?? '')
        if (!q.question?.startsWith(`Caso ${org}:`))
          semCenario.push(q.id ?? '?')
      }
    }
    expect(semCenario).toEqual([])
  })
})

describe('QuestionLoader.getQuestionPool', () => {
  it('usa o cache da segunda chamada sem reler o JSON', async () => {
    vi.resetModules()
    const loader = await import('../../src/data/QuestionLoader.js')
    const db = await import('../../src/sync/IndexedDB.js')

    vi.mocked(db.loadAllQuestions).mockResolvedValue([
      { id: 'cached', json: '{"id":"cached"}' },
    ])
    const first = await loader.getQuestionPool()
    vi.mocked(db.loadAllQuestions).mockResolvedValue([
      { id: 'changed', json: '{invalid' },
    ])
    await expect(loader.getQuestionPool()).resolves.toBe(first)
  })

  it('invalida o cache somente após um reseed completo', async () => {
    vi.resetModules()
    const loader = await import('../../src/data/QuestionLoader.js')
    const db = await import('../../src/sync/IndexedDB.js')
    const store = new Map<string, string>()
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
      vi.fn(async () => ({ ok: true, json: async () => [validQ] })),
    )
    vi.mocked(db.questionsCount).mockResolvedValue(0)
    vi.mocked(db.seedQuestions).mockResolvedValue(undefined)
    vi.mocked(db.loadAllQuestions).mockResolvedValue([
      { id: 'old', json: '{"id":"old"}' },
    ])
    await loader.getQuestionPool()
    await loader.ensureSeeded()
    vi.mocked(db.loadAllQuestions).mockResolvedValue([
      { id: 'new', json: '{"id":"new"}' },
    ])

    const pool = await loader.getQuestionPool()
    expect(pool.map((q: { id: string }) => q.id)).toEqual(['new'])
  })
})
