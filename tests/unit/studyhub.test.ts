import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuestionPool } from '../../src/data/QuestionLoader.js'
import type { Question } from '../../src/engine/question-schema.js'
import { generateStudyPlan } from '../../src/study/study-hub.js'
import { loadStudyTopics, matchTopic } from '../../src/study/topics.js'
import {
  loadAllProgress,
  loadAttemptsForUser,
} from '../../src/sync/IndexedDB.js'
import type { AttemptRecord } from '../../src/sync/types.js'

vi.mock('../../src/sync/IndexedDB.js', () => ({
  loadAllAttempts: vi.fn(),
  loadAttemptsForUser: vi.fn(),
  loadAllProgress: vi.fn(),
  loadAllDoubts: vi.fn(),
}))

vi.mock('../../src/data/QuestionLoader.js', () => ({
  ensureSeeded: vi.fn(),
  getBankLine: vi.fn(),
  getBankMeta: vi.fn(),
  getQuestionPool: vi.fn(),
}))

const q = (id: string, domain: string): Question =>
  ({
    id,
    domain,
    subdomain: `${domain}-x`,
    type: 'single',
    difficulty: 'medium',
    question: 'Questão de teste com mais de cinquenta caracteres para valer.',
    options: [
      { letter: 'A', text: 'a' },
      { letter: 'B', text: 'b' },
      { letter: 'C', text: 'c' },
      { letter: 'D', text: 'd' },
    ],
    correct: ['A'],
    explanation:
      'Explicação de teste deliberadamente longa para passar do mínimo de cem caracteres.',
    source: 'original',
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
  }) as Question

const att = (
  id: string,
  answers: { questionId: string; correct: boolean }[],
): AttemptRecord => ({
  id,
  userId: 'u1',
  kind: 'simulado',
  simuladoId: 'sim-dinamico',
  startedAt: 0,
  finishedAt: 1,
  durationSeconds: 60,
  questions: answers.length,
  score: 500,
  passed: false,
  answers: answers.map((a) => ({
    ...a,
    given: a.correct ? ['A'] : ['B'],
    expected: ['A'],
  })),
  byDomain: {},
  errorTags: {},
  createdAt: 1,
})

describe('study-hub', () => {
  const store = new Map<string, string>()

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
    vi.mocked(getQuestionPool).mockResolvedValue([
      q('az104-co-001', 'compute'),
      q('az104-co-002', 'compute'),
      q('az104-ig-001', 'identidade-governanca'),
      q('az104-ig-002', 'identidade-governanca'),
      q('az104-st-001', 'storage'),
    ])
    vi.mocked(loadAllProgress).mockResolvedValue([])
  })

  it('domínio fraco (<70%) gera links priorizados do domínio', async () => {
    vi.mocked(loadAttemptsForUser).mockResolvedValue([
      att('a1', [
        { questionId: 'az104-co-001', correct: false },
        { questionId: 'az104-co-002', correct: false },
        { questionId: 'az104-ig-001', correct: true },
        { questionId: 'az104-ig-002', correct: true },
      ]),
    ])
    const plan = await generateStudyPlan('u1')
    expect(plan.hasData).toBe(true)
    expect(plan.weakDomains.map((w) => w.domain)).toEqual(['compute'])
    expect(plan.weakDomains[0].pct).toBe(0)
    // Domínio sem respostas (storage) não entra como fraco
    expect(plan.weakDomains.some((w) => w.domain === 'storage')).toBe(false)
    expect(plan.links.length).toBeGreaterThan(0)
    expect(plan.links.every((l) => l.domain === 'compute')).toBe(true)
    expect(plan.links.every((l) => l.priority === 'high')).toBe(true)
  })

  it('sem attempts: sem dados, sem links', async () => {
    vi.mocked(loadAttemptsForUser).mockResolvedValue([])
    const plan = await generateStudyPlan('u1')
    expect(plan.hasData).toBe(false)
    expect(plan.weakDomains).toEqual([])
    expect(plan.links).toEqual([])
  })

  it('matchTopic casa prefixo no domínio; ignora resto', async () => {
    const topics = await loadStudyTopics()
    expect(topics.length).toBeGreaterThanOrEqual(30)
    expect(matchTopic(topics, 'compute', 'vms-tamanhos')?.topic).toBe('vms')
    expect(matchTopic(topics, 'compute', 'zzz-inexistente')).toBeNull()
  })
})
