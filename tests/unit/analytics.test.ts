import { describe, expect, it } from 'vitest'
import { analyzeDistractors } from '../../src/analytics/distractor.js'
import { computeHeatmap } from '../../src/analytics/heatmap.js'
import type { Question } from '../../src/engine/question-schema.js'
import type { AttemptRecord } from '../../src/sync/types.js'

const q = (id: string, subdomain: string): Question =>
  ({
    id,
    domain: 'compute',
    subdomain,
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
  answers: { questionId: string; correct: boolean; given?: string[] }[],
): AttemptRecord => ({
  id,
  userId: 'u1',
  kind: 'simulado',
  simuladoId: 'sim-dinamico',
  startedAt: 0,
  finishedAt: Number(id.slice(1)) || 0,
  durationSeconds: 60,
  questions: answers.length,
  score: 0,
  passed: false,
  answers: answers.map((a) => ({
    ...a,
    given: a.given ?? (a.correct ? ['A'] : ['B']),
    expected: ['A'],
  })),
  byDomain: {},
  errorTags: {},
  createdAt: 0,
})

describe('analytics', () => {
  it('heatmap agrega por subdomain e ordena piores primeiro', () => {
    const pool = [q('az104-co-001', 'vms-tamanhos'), q('az104-co-002', 'sla')]
    const attempts = [
      att('a1', [
        { questionId: 'az104-co-001', correct: false },
        { questionId: 'az104-co-002', correct: true },
      ]),
    ]
    const cells = computeHeatmap(attempts, pool)
    expect(cells.map((c) => c.subdomain)).toEqual(['vms-tamanhos', 'sla'])
    expect(cells[0].pct).toBe(0)
    expect(cells[1].pct).toBe(100)
    expect(cells[0].trend).toBe('stable')
  })

  it('heatmap trend compara recentes x anteriores', () => {
    const pool = [q('az104-co-001', 'vms-tamanhos')]
    const bad = Array.from({ length: 5 }, (_, i) =>
      att(`n${i}`, [{ questionId: 'az104-co-001', correct: false }]),
    )
    const good = Array.from({ length: 5 }, (_, i) =>
      att(`o${i}`, [{ questionId: 'az104-co-001', correct: true }]),
    )
    // loadAllAttempts ordena finishedAt desc: recentes primeiro
    const cells = computeHeatmap(
      [...bad.map((a, i) => ({ ...a, finishedAt: 100 + i })), ...good],
      pool,
    )
    expect(cells[0].trend).toBe('down')
  })

  it('distractor flag >40% dos erros na mesma letra', () => {
    const attempts = [
      att('a1', [
        { questionId: 'az104-co-001', correct: false, given: ['B'] },
        { questionId: 'az104-co-001', correct: false, given: ['B'] },
        { questionId: 'az104-co-001', correct: false, given: ['C'] },
      ]),
    ]
    const flags = analyzeDistractors(attempts)
    expect(flags).toHaveLength(1)
    expect(flags[0]).toMatchObject({
      questionId: 'az104-co-001',
      letter: 'B',
    })
    expect(flags[0].rate).toBeCloseTo(2 / 3, 5)
  })

  it('distractor sem concentração não flagga', () => {
    const attempts = [
      att('a1', [
        { questionId: 'az104-co-001', correct: false, given: ['B'] },
        { questionId: 'az104-co-001', correct: false, given: ['C'] },
        { questionId: 'az104-co-001', correct: false, given: ['D'] },
        { questionId: 'az104-co-001', correct: false, given: ['B'] },
        { questionId: 'az104-co-001', correct: false, given: ['C'] },
      ]),
    ]
    // Top (B) tem 2/5 = 40% — abaixo do limiar estrito >40%
    expect(analyzeDistractors(attempts)).toEqual([])
  })
})
