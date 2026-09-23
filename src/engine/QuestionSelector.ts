import type { Question } from './question-schema.js'

// RNG seedado (mulberry32) — mesmo seed, mesma ordem. Fisher-Yates.
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Quotas por domínio via largest-remainder (determinístico) §5.
export function domainQuotas(
  questionCount: number,
  proportions: { domain: string; share: number }[],
): Record<string, number> {
  const quotas: Record<string, number> = {}
  const remainders: { domain: string; rem: number }[] = []
  let assigned = 0
  for (const p of proportions) {
    const exact = questionCount * p.share
    const base = Math.floor(exact)
    quotas[p.domain] = base
    assigned += base
    remainders.push({ domain: p.domain, rem: exact - base })
  }
  remainders.sort((a, b) => b.rem - a.rem || (a.domain < b.domain ? -1 : 1))
  let left = questionCount - assigned
  let i = 0
  while (left > 0 && remainders.length > 0) {
    quotas[remainders[i % remainders.length].domain]++
    left--
    i++
  }
  return quotas
}

export interface SelectOptions {
  seed: number
  count: number
  quotas: Record<string, number> // domínio → qtd
  recentIds: Set<string> // últimas 100/domínio (histórico)
  usageCount: Map<string, number>
}

export function selectQuestions(
  pool: Question[],
  opts: SelectOptions,
): Question[] {
  const rand = mulberry32(opts.seed)
  const picked: Question[] = []

  for (const [domain, quota] of Object.entries(opts.quotas)) {
    const candidates = pool
      .filter((q) => q.domain === domain && !opts.recentIds.has(q.id))
      .sort(
        (a, b) =>
          (opts.usageCount.get(a.id) ?? 0) - (opts.usageCount.get(b.id) ?? 0),
      )
    // Embaralha empates de uso de forma determinística
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    picked.push(...candidates.slice(0, quota))
  }

  // Shuffle final Fisher-Yates (cases ficam contíguos em etapa posterior — S2 usa mix simples)
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[picked[i], picked[j]] = [picked[j], picked[i]]
  }
  return picked.slice(0, opts.count)
}

// Sim pluralizado fixo: preserva a ordem do array de ids (sim oficiais).
export function pickByIds<T extends { id: string }>(
  pool: T[],
  ids: string[],
): T[] {
  const byId = new Map(pool.map((q) => [q.id, q]))
  const out: T[] = []
  for (const id of ids) {
    const q = byId.get(id)
    if (q) out.push(q)
  }
  return out
}
