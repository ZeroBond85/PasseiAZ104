import { getQuestionPool } from '../data/QuestionLoader.js'
import type { Question } from '../engine/question-schema.js'
import { loadAllProgress, loadAttemptsForUser } from '../sync/IndexedDB.js'
import {
  loadProfile,
  type StudyProfile,
  saveProfile,
  type WeakDomain,
} from './study-profile.js'
import { loadStudyTopics, matchTopic, type StudyTopic } from './topics.js'

export interface StudyLink {
  topicId: string
  domain: string
  label: string
  url: string
  priority: 'high' | 'medium'
  seen: boolean
}

export interface StudyPlan {
  weakDomains: WeakDomain[]
  links: StudyLink[]
  leitnerDue: number
  hasData: boolean
}

function topicIdOf(t: StudyTopic): string {
  return `${t.domain}/${t.topic}`
}

// Plano de estudo: domínios fracos (<70% nos últimos 5 simulados) → tópicos
// curados (match por subdomain) → links priorizados. Recalculado a cada load;
// weakdomains persistem no perfil p/ sync entre dispositivos.
export async function generateStudyPlan(userId: string): Promise<StudyPlan> {
  const [attempts, pool, topics, progress] = await Promise.all([
    loadAttemptsForUser(userId).catch(() => []),
    getQuestionPool().catch(() => []),
    loadStudyTopics(),
    loadAllProgress().catch(() => []),
  ])

  const byId = new Map(pool.map((q) => [q.id, q.domain]))
  const agg = new Map<string, { total: number; correct: number }>()
  for (const a of attempts.filter((x) => x.kind === 'simulado').slice(0, 5)) {
    for (const an of a.answers ?? []) {
      const d = byId.get(an.questionId)
      if (!d) continue
      const s = agg.get(d) ?? { total: 0, correct: 0 }
      s.total++
      if (an.correct) s.correct++
      agg.set(d, s)
    }
  }

  const now = Date.now()
  const weak: WeakDomain[] = [...agg.entries()]
    .filter(([, s]) => s.total > 0)
    .map(([domain, s]) => ({
      domain,
      pct: Math.round((s.correct / s.total) * 100),
      at: now,
    }))
    .filter((w) => w.pct < 70)
    .sort((a, b) => a.pct - b.pct)

  const profile = loadProfile(userId)
  const seenSet = new Set(profile.seen.map((s) => s.topicId))
  const links: StudyLink[] = []
  for (const w of weak) {
    for (const t of topics
      .filter((x) => x.domain === w.domain)
      .sort((a, b) => a.order_idx - b.order_idx)) {
      if (links.length >= 10) break
      const id = topicIdOf(t)
      if (links.some((l) => l.topicId === id)) continue
      links.push({
        topicId: id,
        domain: t.domain,
        label: t.label,
        url: t.url,
        priority: 'high',
        seen: seenSet.has(id),
      })
    }
    if (links.length >= 10) break
  }

  const leitnerDue = progress.filter((p) => p.dueAt <= now).length
  saveProfile(userId, { ...profile, weak })
  return {
    weakDomains: weak,
    links,
    leitnerDue,
    hasData: attempts.length > 0,
  }
}

export type { StudyProfile }

export interface StudyLinkRef {
  domain: string
  subdomain: string
  label: string
  url: string
}

// Links p/ o pós-simulado: tópico curado que casa com a questão errada
// (fallback: sourceUrl da própria questão). Deduplicado por URL, cap 8.
export async function buildStudyLinks(
  missed: Question[],
): Promise<StudyLinkRef[]> {
  const topics = await loadStudyTopics()
  const out: StudyLinkRef[] = []
  const seen = new Set<string>()
  for (const q of missed) {
    const t = matchTopic(topics, q.domain, q.subdomain)
    const url =
      t?.url ??
      (q.source === 'mslearn' || q.source === 'community'
        ? q.sourceUrl
        : undefined)
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push({
      domain: q.domain,
      subdomain: q.subdomain,
      label: t?.label ?? q.subdomain.split('-').join(' '),
      url,
    })
    if (out.length >= 8) break
  }
  return out
}
