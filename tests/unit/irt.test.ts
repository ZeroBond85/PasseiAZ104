import { describe, expect, it } from 'vitest'
import { estimateBank, estimateItem, MIN_SAMPLE } from '../../src/engine/irt.js'
import type { AttemptRecord } from '../../src/sync/types.js'

const att = (id: string, correct: boolean[]): AttemptRecord => ({
  id,
  userId: 'u1',
  kind: 'simulado',
  simuladoId: 'sim-dinamico',
  startedAt: 0,
  finishedAt: 1,
  durationSeconds: 60,
  questions: correct.length,
  score: 0,
  passed: false,
  answers: correct.map((c, i) => ({
    questionId: `az104-co-00${i + 1}`,
    correct: c,
    given: c ? ['A'] : ['B'],
    expected: ['A'],
  })),
  byDomain: {},
  errorTags: {},
  createdAt: 1,
})

describe('IRT 1PL', () => {
  it('b negativo p/ fácil, positivo p/ difícil, zero p/ 50%', () => {
    expect(estimateItem(45, 50, 'q')?.b).toBeLessThan(0)
    expect(estimateItem(5, 50, 'q')?.b).toBeGreaterThan(0)
    expect(estimateItem(25, 50, 'q')?.b).toBeCloseTo(0, 5)
  })

  it(`gate: amostra < ${MIN_SAMPLE} retorna null`, () => {
    expect(estimateItem(0, 5, 'q')).toBeNull()
    expect(estimateItem(29, 29, 'q')).toBeNull()
    expect(estimateItem(30, 30, 'q')).not.toBeNull()
  })

  it('estimateBank agrega attempts e respeita o gate', () => {
    const attempts = [
      ...Array.from({ length: 15 }, (_, i) => att(`a${i}`, [true, false])),
    ]
    // q1: 15/15 (n=15 <30 → fora), q2: 0/15 (fora)
    const params = estimateBank(attempts)
    expect(params).toEqual({})
    const big = [
      ...Array.from({ length: 30 }, (_, i) => att(`b${i}`, [true, false])),
    ]
    const params2 = estimateBank(big)
    expect(Object.keys(params2).sort()).toEqual([
      'az104-co-001',
      'az104-co-002',
    ])
    expect(params2['az104-co-001'].b).toBeLessThan(0)
    expect(params2['az104-co-002'].b).toBeGreaterThan(0)
  })
})
