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

describe('ScoringEngine — 1 ponto por item, múltipla tudo-ou-nada', () => {
  it('exemplo canônico: 10 easy + 25 medium + 15 hard → maxRaw 50, corte 700', () => {
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
    // 1 ponto por item: a dificuldade não pesa mais, então maxRaw é a contagem.
    expect(r.maxRaw).toBe(50)
    expect(r.score).toBe(1000)
    expect(r.passed).toBe(true)
    // corte 70% de 50 = 35 acertos → 35/50 = 700
    expect(Math.ceil(0.7 * r.maxRaw)).toBe(35)
  })

  it('dificuldade NÃO altera o peso: hard vale o mesmo que easy', () => {
    const easy = q({ id: 'w-easy', difficulty: 'easy' })
    const hard = q({ id: 'w-hard', difficulty: 'hard' })
    const r = scoreSession(
      [easy, hard],
      new Map([
        ['w-easy', ['A']],
        ['w-hard', ['A']],
      ]),
    )
    expect(r.byDomain['identidade-governanca'].pct).toBe(100)
    expect(r.raw).toBe(2)
  })

  it('múltipla parcial SEM erro não vale nada (tudo-ou-nada)', () => {
    const qq = q({ id: 't-m', type: 'multiple', correct: ['A', 'B', 'C'] })
    const r = scoreSession([qq], new Map([['t-m', ['A', 'B']]]))
    // Regressão do Gate 1.2: antes w×(k/n) dava 20×(2/3) e inflava a nota.
    expect(r.raw).toBe(0)
    expect(r.score).toBe(0)
    expect(r.passed).toBe(false)
  })

  it('múltipla com o conjunto exato vale o ponto inteiro', () => {
    const qq = q({ id: 't-m-ok', type: 'multiple', correct: ['A', 'B'] })
    const r = scoreSession([qq], new Map([['t-m-ok', ['B', 'A']]]))
    expect(r.raw).toBe(1)
    expect(r.score).toBe(1000)
  })

  it('múltipla com gabarito completo mas ordem extra não conta', () => {
    const qq = q({ id: 't-m-3', type: 'multiple', correct: ['A', 'B'] })
    const r = scoreSession([qq], new Map([['t-m-3', ['A', 'B', 'C']]]))
    expect(r.raw).toBe(0)
  })

  it('erro marcado zera a questão', () => {
    const qq = q({ id: 't-z', type: 'multiple', correct: ['A', 'B'] })
    const r = scoreSession([qq], new Map([['t-z', ['A', 'C']]]))
    expect(r.raw).toBe(0)
    expect(r.score).toBe(0)
    expect(r.passed).toBe(false)
  })

  it('sem resposta zera', () => {
    const r = scoreSession([q({ id: 't-none' })], new Map())
    expect(r.raw).toBe(0)
    expect(r.score).toBe(0)
  })

  it('regressão do sim-oficial-01: metade das múltiplas erradas = reprovado', () => {
    // 40 itens: 10 múltiplas (gabarito A,B) e 30 simples (gabarito A).
    // Cenário real: as 30 simples certas + "1 de 2" em cada múltipla.
    const qs: Question[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        q({
          id: `m-${i}`,
          type: 'multiple',
          correct: ['A', 'B'],
        }),
      ),
      ...Array.from({ length: 30 }, (_, i) => q({ id: `s-${i}` })),
    ]
    const meia = new Map<string, string[]>(qs.map((x) => [x.id, ['A']]))
    const rMeia = scoreSession(qs, meia)
    // Regra real: 30/40 = 750 → reprova no corte de 700. O motor antigo dava
    // 30 + 10×(1/2) = 35 pontos sobre maxRaw 40 ponderado → 868 e "passava".
    expect(rMeia.raw).toBe(30)
    expect(rMeia.score).toBe(750)
    expect(rMeia.passed).toBe(true)

    const todasErradas = new Map<string, string[]>(
      qs.map((x) => [x.id, x.type === 'multiple' ? ['C'] : ['A']]),
    )
    const rZero = scoreSession(qs, todasErradas)
    expect(rZero.raw).toBe(30)
    expect(rZero.score).toBe(750)
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
