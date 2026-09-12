import { describe, expect, it } from 'vitest'
import type { Question } from '../../src/engine/question-schema.js'
import { scoreSession } from '../../src/engine/ScoringEngine.js'

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

describe('ScoringEngine §5', () => {
  it('exemplo canônico: 10 easy + 25 medium + 15 hard → maxRaw 1025, corte 718', () => {
    const qs: Question[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        q({ id: `t-easy-${i}`, difficulty: 'easy' }),
      ),
      ...Array.from({ length: 25 }, (_, i) =>
        q({ id: `t-med-${i}`, difficulty: 'medium' }),
      ),
      ...Array.from({ length: 15 }, (_, i) =>
        q({ id: `t-hard-${i}`, difficulty: 'hard' }),
      ),
    ]
    const answers = new Map(qs.map((x) => [x.id, ['A']] as [string, string[]]))
    const r = scoreSession(qs, answers)
    expect(r.maxRaw).toBe(10 * 15 + 25 * 20 + 15 * 25)
    expect(r.score).toBe(1000)
    expect(r.passed).toBe(true)
    expect(Math.ceil(0.7 * r.maxRaw)).toBe(718)
  })

  it('múltipla parcial sem erro: w×(k/n)', () => {
    const qq = q({ id: 't-m', type: 'multiple', correct: ['A', 'B', 'C'] })
    const r = scoreSession([qq], new Map([['t-m', ['A', 'B']]]))
    expect(r.raw).toBeCloseTo(20 * (2 / 3), 5)
    expect(r.score).toBe(Math.round(((20 * 2) / 3 / 20) * 1000))
  })

  it('erro marcado zera a questão', () => {
    const qq = q({ id: 't-z', type: 'multiple', correct: ['A', 'B'] })
    const r = scoreSession([qq], new Map([['t-z', ['A', 'C']]]))
    expect(r.raw).toBe(0)
    expect(r.score).toBe(0)
    expect(r.passed).toBe(false)
  })

  it('weakAreas <70% por domínio', () => {
    const a = q({ id: 't-a', domain: 'identidade-governanca' })
    const b = q({ id: 't-b', domain: 'storage' })
    const r = scoreSession(
      [a, b],
      new Map([
        ['t-a', ['A']],
        ['t-b', ['B']],
      ]),
    )
    expect(r.byDomain['identidade-governanca'].pct).toBe(100)
    expect(r.weakAreas).toContain('storage')
  })
})
