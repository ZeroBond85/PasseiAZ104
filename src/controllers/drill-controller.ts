import { ensureSeeded, getQuestionPool } from '../data/QuestionLoader.js'
import type { Question } from '../engine/question-schema.js'
import { loadAllProgress, loadAttemptsForUser } from '../sync/IndexedDB.js'

// Drill (Sprint 4, PLAN-3): "Treinar meus erros" — 10q priorizadas por ciência.
// Score composto: domínio fraco ×3 + questão errada ×2 + Leitner vencido ×2 +
// distrator forte ×1. Execução reaproveita o TreinoController (startCustom).
export interface DrillInput {
  weakDomains: string[]
  errorIds: Set<string>
  dueIds: Set<string>
  distractorIds: Set<string>
  pool: Question[]
  count?: number
}

export function buildDrillPool(input: DrillInput): Question[] {
  const count = input.count ?? 10
  const scored = new Map<string, { q: Question; score: number }>()
  for (const q of input.pool) {
    let score = 0
    if (input.weakDomains.includes(q.domain)) score += 3
    if (input.errorIds.has(q.id)) score += 2
    if (input.dueIds.has(q.id)) score += 2
    if (input.distractorIds.has(q.id)) score += 1
    if (score > 0) scored.set(q.id, { q, score })
  }
  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.q)
}

// Monta o input a partir do estado real do usuário (attempts + progress + pool).
export async function buildDrillQuestions(
  userId: string,
  count = 10,
): Promise<Question[]> {
  await ensureSeeded()
  const [attempts, pool, progress] = await Promise.all([
    loadAttemptsForUser(userId).catch(() => []),
    getQuestionPool().catch(() => []),
    loadAllProgress().catch(() => []),
  ])
  const now = Date.now()
  const dueIds = new Set(
    progress.filter((p) => p.dueAt <= now).map((p) => p.questionId),
  )
  const errorIds = new Set<string>()
  const distractorIds = new Set<string>()
  const domAgg = new Map<string, { total: number; correct: number }>()
  const byId = new Map(pool.map((q) => [q.id, q.domain]))
  for (const a of attempts.filter((x) => x.kind === 'simulado').slice(0, 5)) {
    for (const an of a.answers ?? []) {
      const d = byId.get(an.questionId)
      if (!d) continue
      const s = domAgg.get(d) ?? { total: 0, correct: 0 }
      s.total++
      if (an.correct) s.correct++
      else {
        errorIds.add(an.questionId)
        const wrong = an.given.find((g) => !an.expected.includes(g))
        if (wrong) distractorIds.add(an.questionId)
      }
      domAgg.set(d, s)
    }
  }
  const weakDomains = [...domAgg.entries()]
    .filter(([, s]) => s.total > 0 && s.correct / s.total < 0.7)
    .map(([d]) => d)
  return buildDrillPool({
    weakDomains,
    errorIds,
    dueIds,
    distractorIds,
    pool,
    count,
  })
}
