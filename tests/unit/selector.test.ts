import { describe, expect, it } from 'vitest'
import {
  domainQuotas,
  mulberry32,
  selectQuestions,
} from '../../src/engine/QuestionSelector.js'
import type { Question } from '../../src/engine/question-schema.js'

function q(id: string, domain: string): Question {
  return {
    id,
    domain: domain as Question['domain'],
    subdomain: 's',
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
  }
}

describe('QuestionSelector §5', () => {
  it('largest-remainder soma questionCount (30q)', () => {
    const quotas = domainQuotas(30, [
      { domain: 'identidade-governanca', share: 0.24 },
      { domain: 'storage', share: 0.18 },
      { domain: 'compute', share: 0.24 },
      { domain: 'rede-virtual', share: 0.2 },
      { domain: 'monitoramento', share: 0.14 },
    ])
    expect(Object.values(quotas).reduce((a, b) => a + b, 0)).toBe(30)
  })

  it('mesmo seed → mesma seleção (determinístico)', () => {
    const pool = Array.from({ length: 40 }, (_, i) =>
      q(`az104-ig-${i}`, 'identidade-governanca'),
    )
    const opts = {
      seed: 7,
      count: 12,
      quotas: { 'identidade-governanca': 12 },
      recentIds: new Set<string>(),
      usageCount: new Map<string, number>(),
    }
    const a = selectQuestions(pool, opts).map((x) => x.id)
    const b = selectQuestions(pool, opts).map((x) => x.id)
    expect(a).toEqual(b)
    expect(a).toHaveLength(12)
  })

  it('exclui recentIds e prefere menor usageCount', () => {
    const pool = [
      q('az104-ig-1', 'identidade-governanca'),
      q('az104-ig-2', 'identidade-governanca'),
    ]
    const picked = selectQuestions(pool, {
      seed: 1,
      count: 1,
      quotas: { 'identidade-governanca': 1 },
      recentIds: new Set(['az104-ig-1']),
      usageCount: new Map(),
    })
    expect(picked.map((x) => x.id)).toEqual(['az104-ig-2'])
  })

  it('mulberry32 é estável', () => {
    const r1 = mulberry32(42)
    const r2 = mulberry32(42)
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()])
  })
})
