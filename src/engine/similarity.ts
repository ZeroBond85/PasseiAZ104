// Similaridade por trigramas p/ dedup semântico (PLAN-4 C4).
// FNV-1a (validate) só pega texto idêntico; paráfrases passam. Jaccard de
// trigramas do texto normalizado pega reescritas próximas. Limiares calibrados
// em comentário no validate-questions.mts (pares reais do banco).
export const SEMANTIC_HIGH = 0.85
export const SEMANTIC_MEDIUM = 0.7

export function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function trigrams(s: string): Set<string> {
  const t = normText(s)
  const out = new Set<string>()
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3))
  return out
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  const [small, big] = a.size <= b.size ? [a, b] : [b, a]
  for (const x of small) if (big.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/** Similaridade [0,1] entre dois enunciados (1 = idênticos). */
export function textSimilarity(a: string, b: string): number {
  if (normText(a) === normText(b)) return 1
  return jaccard(trigrams(a), trigrams(b))
}
