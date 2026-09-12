import type { Question } from './question-schema.js'

// Pesos por dificuldade §5 — maxRaw nunca por tipo.
export const WEIGHT = { easy: 15, medium: 20, hard: 25 } as const

export interface ScoreResult {
  raw: number
  maxRaw: number
  score: number // 0..1000
  passed: boolean
  byDomain: Record<string, { raw: number; max: number; pct: number }>
  weakAreas: string[] // domínios <70%
}

export function scoreSession(
  questions: Question[],
  answers: Map<string, string[]>,
): ScoreResult {
  let raw = 0
  let maxRaw = 0
  const byDomain: Record<string, { raw: number; max: number; pct: number }> = {}

  for (const q of questions) {
    const w = WEIGHT[q.difficulty]
    maxRaw += w
    if (!byDomain[q.domain]) byDomain[q.domain] = { raw: 0, max: 0, pct: 0 }
    const d = byDomain[q.domain]
    d.max += w

    const given = new Set(answers.get(q.id) ?? [])
    const expected = new Set(q.correct)
    const wrong = [...given].some((g) => !expected.has(g))
    if (wrong || given.size === 0) continue // erro marcado zera; sem resposta = 0

    const k = [...given].filter((g) => expected.has(g)).length
    const credit = w * (k / expected.size)
    raw += credit
    d.raw += credit
  }

  const score = maxRaw === 0 ? 0 : Math.round((raw / maxRaw) * 1000)
  const weakAreas: string[] = []
  for (const [domain, d] of Object.entries(byDomain)) {
    d.pct = d.max === 0 ? 0 : Math.round((d.raw / d.max) * 100)
    if (d.pct < 70) weakAreas.push(domain)
  }
  return { raw, maxRaw, score, passed: score >= 700, byDomain, weakAreas }
}
