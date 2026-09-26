import { describe, expect, it, vi } from 'vitest'
import {
  buildDrillPool,
  buildDrillQuestions,
} from '../../src/controllers/drill-controller.js'
import { TreinoController } from '../../src/controllers/treino-controller.js'
import { getQuestionPool } from '../../src/data/QuestionLoader.js'
import type { Question } from '../../src/engine/question-schema.js'
import {
  loadAllProgress,
  loadAttemptsForUser,
} from '../../src/sync/IndexedDB.js'

vi.mock('../../src/data/QuestionLoader.js', () => ({
  ensureSeeded: vi.fn(),
  getBankLine: vi.fn(),
  getBankMeta: vi.fn(),
  getQuestionPool: vi.fn(),
}))

vi.mock('../../src/sync/IndexedDB.js', () => ({
  loadAllAttempts: vi.fn(),
  loadAttemptsForUser: vi.fn(),
  loadAllProgress: vi.fn(),
  loadAllDoubts: vi.fn(),
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

describe('drill', () => {
  it('buildDrillPool prioriza fraco > erro > due > distrator', () => {
    const pool = [
      q('az104-co-001', 'compute'),
      q('az104-co-002', 'compute'),
      q('az104-ig-001', 'identidade-governanca'),
    ]
    const out = buildDrillPool({
      weakDomains: ['compute'],
      errorIds: new Set(['az104-ig-001']),
      dueIds: new Set(['az104-co-002']),
      distractorIds: new Set(),
      pool,
      count: 10,
    })
    // co-002: 3+2=5 · co-001: 3 · ig-001: 2
    expect(out.map((x) => x.id)).toEqual([
      'az104-co-002',
      'az104-co-001',
      'az104-ig-001',
    ])
  })

  it('buildDrillPool respeita count e ignora score 0', () => {
    const pool = [q('az104-co-001', 'compute')]
    expect(
      buildDrillPool({
        weakDomains: [],
        errorIds: new Set(),
        dueIds: new Set(),
        distractorIds: new Set(),
        pool,
      }),
    ).toEqual([])
    expect(
      buildDrillPool({
        weakDomains: ['compute'],
        errorIds: new Set(),
        dueIds: new Set(),
        distractorIds: new Set(),
        pool,
        count: 5,
      }),
    ).toHaveLength(1)
  })

  it('startCustom executa pool pronto com label livre', async () => {
    const t = new TreinoController()
    expect(await t.startCustom([], 'Meus erros')).toBe(false)
    expect(
      await t.startCustom([q('az104-co-001', 'compute')], 'Meus erros'),
    ).toBe(true)
    expect(t.domain).toBe('Meus erros')
    expect(t.engine.state).toBe('active')
  })

  it('buildDrillQuestions monta do estado real (IDB)', async () => {
    vi.mocked(getQuestionPool).mockResolvedValue([
      q('az104-co-001', 'compute'),
      q('az104-ig-001', 'identidade-governanca'),
    ])
    vi.mocked(loadAttemptsForUser).mockResolvedValue([
      {
        id: 'a1',
        userId: 'u1',
        kind: 'simulado',
        simuladoId: 'sim-dinamico',
        startedAt: 0,
        finishedAt: 1,
        durationSeconds: 60,
        questions: 2,
        score: 500,
        passed: false,
        answers: [
          {
            questionId: 'az104-co-001',
            correct: false,
            given: ['B'],
            expected: ['A'],
          },
          {
            questionId: 'az104-ig-001',
            correct: true,
            given: ['A'],
            expected: ['A'],
          },
        ],
        byDomain: {},
        errorTags: {},
        createdAt: 1,
      },
    ])
    vi.mocked(loadAllProgress).mockResolvedValue([])
    const out = await buildDrillQuestions('u1', 10)
    // compute fraco (0%) → co-001 primeiro; ig 100% fica de fora
    expect(out.map((x) => x.id)).toEqual(['az104-co-001'])
  })
})
