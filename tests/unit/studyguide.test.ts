import { describe, expect, it } from 'vitest'
import type { Question } from '../../src/engine/question-schema.js'
import { analyzeAttempt, readiness } from '../../src/engine/StudyGuide.js'

function q(partial: Partial<Question> & { id: string }): Question {
  return {
    domain: 'identidade-governanca',
    subdomain: 'entra-id',
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
      'Explicação de teste com mais de cem caracteres para satisfazer o mínimo exigido pelo schema.',
    source: 'original',
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    ...partial,
  }
}

describe('StudyGuide (P3)', () => {
  it('analyzeAttempt: pontua, domínios fracos e topErrors só com erros', () => {
    const a = q({ id: 'g-a', domain: 'identidade-governanca' })
    const b = q({ id: 'g-b', domain: 'storage' })
    const c = q({ id: 'g-c', domain: 'compute' })
    const all = [a, b, c]
    const answers = new Map<string, string[]>([
      ['g-a', ['A']],
      ['g-b', ['B']],
      ['g-c', ['A']],
    ])
    const g = analyzeAttempt(all, answers, [])
    expect(g.score).toBe(Math.round((2 / 3) * 1000))
    expect(g.passed).toBe(false)
    expect(g.weakDomains.map((d) => d.domain)).toContain('storage')
    expect(g.topErrors.length).toBe(1)
    expect(g.topErrors[0].question.id).toBe('g-b')
    expect(g.tips.length).toBeGreaterThan(0)
  })

  it('readiness §12: exige média-5, domínios e caixa 1', () => {
    const ok = (n: number) =>
      new Array(n).fill(0).map((_, i) => ({ score: 750 + i }))
    expect(readiness(ok(5), { a: 90, b: 80 }, []).ready).toBe(true)
    expect(readiness([{ score: 600 }], { a: 90, b: 80 }, []).ready).toBe(false)
    const box1 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
      questionId: `x-${i}`,
      box: 0,
      dueAt: 1,
      usageCount: 1,
      lastSeenAt: 1,
    }))
    expect(readiness(ok(5), { a: 90, b: 80 }, box1).ready).toBe(false)
  })
})
