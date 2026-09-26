import type { Question } from '../engine/question-schema.js'
import type { AttemptRecord } from '../sync/types.js'

// Heatmap (Sprint 4, PLAN-3): agrega por subdomain × tipo × dificuldade.
// trend compara últimos 5 attempts com os 5 anteriores (por questão).
export interface HeatCell {
  subdomain: string
  type: string
  difficulty: string
  pct: number
  count: number
  trend: 'up' | 'stable' | 'down'
}

export function computeHeatmap(
  attempts: AttemptRecord[],
  pool: Question[],
): HeatCell[] {
  const byId = new Map(pool.map((q) => [q.id, q]))
  // Att mais recentes primeiro (loadAllAttempts já ordena por finishedAt desc)
  const recent = attempts.filter((a) => a.kind === 'simulado').slice(0, 5)
  const older = attempts.filter((a) => a.kind === 'simulado').slice(5, 10)

  const agg = (
    list: AttemptRecord[],
  ): Map<
    string,
    {
      total: number
      correct: number
      cell: Omit<HeatCell, 'pct' | 'trend' | 'count'>
    }
  > => {
    const m = new Map<
      string,
      {
        total: number
        correct: number
        cell: Omit<HeatCell, 'pct' | 'trend' | 'count'>
      }
    >()
    for (const a of list) {
      for (const an of a.answers ?? []) {
        const q = byId.get(an.questionId)
        if (!q) continue
        const key = `${q.subdomain}|${q.type}|${q.difficulty}`
        const s = m.get(key) ?? {
          total: 0,
          correct: 0,
          cell: {
            subdomain: q.subdomain,
            type: q.type,
            difficulty: q.difficulty,
          },
        }
        s.total++
        if (an.correct) s.correct++
        m.set(key, s)
      }
    }
    return m
  }

  const now = agg(recent)
  const prev = agg(older)
  const out: HeatCell[] = []
  for (const [key, s] of now) {
    if (s.total === 0) continue
    const pct = Math.round((s.correct / s.total) * 100)
    const p = prev.get(key)
    const prevPct =
      p && p.total > 0 ? Math.round((p.correct / p.total) * 100) : null
    out.push({
      ...s.cell,
      pct,
      count: s.total,
      trend:
        prevPct === null || Math.abs(pct - prevPct) < 5
          ? 'stable'
          : pct > prevPct
            ? 'up'
            : 'down',
    })
  }
  // Piores primeiro (foco de estudo)
  return out.sort((a, b) => a.pct - b.pct || b.count - a.count)
}
