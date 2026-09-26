import type { AttemptRecord } from '../sync/types.js'

// IRT 1PL (Rasch) — Sprint 4, PLAN-3. Estima dificuldade `b` por questão a
// partir da taxa de acerto observada: b = log((1-p)/p).
// Convenção: b > 0 = mais difícil que a média; b < 0 = mais fácil.
// GATE: só vale com amostra mínima (MIN_SAMPLE=30); abaixo disso o selector
// ignora e mantém o comportamento atual (quotas + usageCount).
export const MIN_SAMPLE = 30

export interface ItemParams {
  questionId: string
  p: number // taxa de acerto 0..1
  b: number // dificuldade Rasch (logits)
  n: number // tamanho da amostra
}

export function estimateItem(
  correct: number,
  total: number,
  questionId: string,
): ItemParams | null {
  if (total < MIN_SAMPLE) return null
  const p = Math.min(Math.max(correct / total, 0.01), 0.99)
  return { questionId, p, b: Math.log((1 - p) / p), n: total }
}

// Agrega attempts (qualquer origem com answers[{questionId,correct}]) → params.
export function estimateBank(
  attempts: AttemptRecord[],
): Record<string, ItemParams> {
  const agg = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    for (const an of a.answers ?? []) {
      const s = agg.get(an.questionId) ?? { correct: 0, total: 0 }
      s.total++
      if (an.correct) s.correct++
      agg.set(an.questionId, s)
    }
  }
  const out: Record<string, ItemParams> = {}
  for (const [id, s] of agg) {
    const p = estimateItem(s.correct, s.total, id)
    if (p) out[id] = p
  }
  return out
}
