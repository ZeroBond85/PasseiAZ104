import type { AttemptRecord } from '../sync/types.js'

// Distrator forte: opção errada escolhida em >40% dos erros da questão.
// Alimenta o drill (peso 1) e o alerta no heatmap/admin.
export const DISTRACTOR_THRESHOLD = 0.4

export interface DistractorFlag {
  questionId: string
  letter: string
  rate: number // fração dos erros que marcaram esta opção
  errors: number
}

export function analyzeDistractors(
  attempts: AttemptRecord[],
): DistractorFlag[] {
  const agg = new Map<
    string,
    { errors: number; byLetter: Map<string, number> }
  >()
  for (const a of attempts.filter((x) => x.kind === 'simulado')) {
    for (const an of a.answers ?? []) {
      if (an.correct) continue
      const wrong = an.given.find((g) => !an.expected.includes(g))
      if (!wrong) continue
      const s = agg.get(an.questionId) ?? {
        errors: 0,
        byLetter: new Map(),
      }
      s.errors++
      s.byLetter.set(wrong, (s.byLetter.get(wrong) ?? 0) + 1)
      agg.set(an.questionId, s)
    }
  }
  const out: DistractorFlag[] = []
  for (const [questionId, s] of agg) {
    const top = [...s.byLetter.entries()].sort((a, b) => b[1] - a[1])[0]
    if (!top) continue
    const rate = top[1] / s.errors
    if (rate > DISTRACTOR_THRESHOLD)
      out.push({ questionId, letter: top[0], rate, errors: s.errors })
  }
  return out.sort((a, b) => b.rate - a.rate)
}
