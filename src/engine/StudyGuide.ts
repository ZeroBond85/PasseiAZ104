import type { ProgressRecord } from '../sync/types.js'
import type { Question } from './question-schema.js'
import { WEIGHT } from './ScoringEngine.js'

export interface WeakDomain {
  domain: string
  pct: number
}

export interface ErrorTypeStat {
  total: number
  correct: number
}

export interface StudyGuideResult {
  score: number
  passed: boolean
  weakDomains: WeakDomain[]
  byType: Record<string, ErrorTypeStat>
  byDifficulty: Record<string, ErrorTypeStat>
  topErrors: { question: Question; missed: boolean }[]
  tips: string[]
  leitnerTip: string | null
}

function isCorrect(q: Question, given: string[] | undefined) {
  const g = new Set(given ?? [])
  const e = new Set(q.correct)
  return g.size === e.size && [...e].every((l) => g.has(l))
}

// Análise pós-simulado — cliente, sem custo de backend. Determinística.
export function analyzeAttempt(
  questions: Question[],
  answers: Map<string, string[]>,
  progress: ProgressRecord[],
): StudyGuideResult {
  const byDomain: Record<string, { total: number; correct: number }> = {}
  const byType: Record<string, ErrorTypeStat> = {}
  const byDifficulty: Record<string, ErrorTypeStat> = {}
  const topErrors: { question: Question; missed: boolean }[] = []
  let raw = 0
  let maxRaw = 0

  for (const q of questions) {
    const w = WEIGHT[q.difficulty]
    maxRaw += w
    byDomain[q.domain] ??= { total: 0, correct: 0 }
    byType[q.type] ??= { total: 0, correct: 0 }
    byDifficulty[q.difficulty] ??= { total: 0, correct: 0 }
    const ok = isCorrect(q, answers.get(q.id))
    byDomain[q.domain].total++
    byType[q.type].total++
    byDifficulty[q.difficulty].total++
    if (ok) {
      raw += w
      byDomain[q.domain].correct++
      byType[q.type].correct++
      byDifficulty[q.difficulty].correct++
    }
    topErrors.push({ question: q, missed: !ok })
  }

  const weakDomains: WeakDomain[] = []
  for (const [domain, d] of Object.entries(byDomain)) {
    if (d.total === 0) continue
    const pct = Math.round((d.correct / d.total) * 100)
    if (pct < 70) weakDomains.push({ domain, pct })
  }
  weakDomains.sort((a, b) => a.pct - b.pct)

  // Top erros: questões erradas (subdomínio + demanda maior primeiro)
  const missed = topErrors
    .filter((x) => x.missed)
    .sort((a, b) => {
      const wa = a.question.subdomain < b.question.subdomain ? -1 : 1
      return wa
    })

  const score = maxRaw === 0 ? 0 : Math.round((raw / maxRaw) * 1000)
  const tips = buildTips(weakDomains, byType, byDifficulty, progress)

  return {
    score,
    passed: score >= 700,
    weakDomains,
    byType,
    byDifficulty,
    topErrors: missed,
    tips,
    leitnerTip: leitnerTip(progress),
  }
}

function buildTips(
  weak: WeakDomain[],
  byType: Record<string, ErrorTypeStat>,
  byDifficulty: Record<string, ErrorTypeStat>,
  progress: ProgressRecord[],
): string[] {
  const out: string[] = []
  for (const d of weak.slice(0, 3)) {
    out.push(
      `Domínio ${d.domain} abaixo de 70% (${d.pct}%) — revise teoria antes de treinar.`,
    )
  }
  for (const [type, s] of Object.entries(byType)) {
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 100
    if (s.total >= 3 && pct < 50)
      out.push(
        `Questões do tipo "${type}" em ${pct}% de acerto — treine eliminação de alternativas.`,
      )
  }
  for (const [diff, s] of Object.entries(byDifficulty)) {
    const pct = s.total ? Math.round((s.correct / s.total) * 100) : 100
    if (diff === 'hard' && s.total >= 3 && pct < 40)
      out.push(
        'Questões difíceis abaixo de 40% — os simulados oficiais cobram esse nível.',
      )
  }
  const due = progress.filter((p) => p.dueAt <= Date.now()).length
  if (due >= 10)
    out.push(`Você tem ${due} revisões vencidas no Leitner — priorize hoje.`)
  if (out.length === 0)
    out.push('Bom desempenho — mantenha o ritmo e revise os erros abaixo.')
  return out.slice(0, 5)
}

function leitnerTip(progress: ProgressRecord[]): string | null {
  const box1 = progress.filter(
    (p) => p.box === 0 && p.dueAt <= Date.now(),
  ).length
  if (box1 >= 10)
    return `Caixa 1 com ${box1} itens vencidos — faça 15 minutos de revisão.`
  return null
}

// Painel de prontidão §12: média-5 ≥750 · nenhum domínio <70% · Caixa 1 <10
export interface Readiness {
  avg5: number | null
  domainsOk: boolean
  leitnerOk: boolean
  ready: boolean
  needed: string[]
}

export function readiness(
  lastScores: { score: number }[],
  byDomain: Record<string, number>,
  progress: ProgressRecord[],
): Readiness {
  const avg5 =
    lastScores.length === 0
      ? null
      : Math.round(
          lastScores.slice(0, 5).reduce((sum, s) => sum + s.score, 0) /
            Math.min(lastScores.length, 5),
        )
  const avg5Ok = avg5 !== null && avg5 >= 750
  const domainsOk = Object.values(byDomain).every((pct) => pct >= 70)
  const box1 = progress.filter(
    (p) => p.box === 0 && p.dueAt <= Date.now(),
  ).length
  const leitnerOk = box1 < 10
  const needed: string[] = []
  if (!avg5Ok) needed.push('média das 5 últimas provas ≥ 750')
  if (!domainsOk) needed.push('todos os domínios ≥ 70%')
  if (!leitnerOk) needed.push('Caixa 1 com menos de 10 itens')
  return {
    avg5,
    domainsOk,
    leitnerOk,
    ready: avg5Ok && domainsOk && leitnerOk,
    needed,
  }
}
