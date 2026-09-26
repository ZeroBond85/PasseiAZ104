import { z } from 'zod'
import bundled from '../../data/study-topics.json'
import { isSyncEnabled, supabase } from '../sync/supabase.js'

export const StudyTopicSchema = z.object({
  id: z.string().optional(),
  domain: z.string(),
  topic: z.string(),
  label: z.string(),
  url: z.string(),
  source: z.string(),
  match: z.array(z.string()),
  order_idx: z.number(),
  is_active: z.boolean().optional(),
})
export type StudyTopic = z.infer<typeof StudyTopicSchema>

let cache: StudyTopic[] | null = null

function fromJson(): StudyTopic[] {
  // Fail-fast: seed corrompido quebra no load, não no meio do estudo.
  return z.array(StudyTopicSchema).parse(bundled)
}

// Fonte: Supabase (curadoria admin, se sync + linhas ativas) com fallback
// para o JSON embarcado (sempre disponível offline). Cache em memória.
export async function loadStudyTopics(): Promise<StudyTopic[]> {
  if (cache) return cache
  if (isSyncEnabled() && supabase) {
    try {
      const { data, error } = await supabase
        .from('az104_study_topics')
        .select('*')
        .eq('is_active', true)
        .order('order_idx')
      if (!error && data && data.length > 0) {
        cache = (data as Record<string, unknown>[]).map((r) => ({
          id: String(r.id),
          domain: String(r.domain),
          topic: String(r.topic),
          label: String(r.label),
          url: String(r.url),
          source: String(r.source ?? 'mslearn'),
          match: Array.isArray(r.match) ? (r.match as string[]) : [],
          order_idx: Number(r.order_idx ?? 0),
        }))
        return cache
      }
    } catch {
      // sem rede/tabela: cai para o JSON embarcado
    }
  }
  cache = fromJson()
  return cache
}

/** Primeiro tópico cujo prefixo casa com o subdomain (ou null). */
export function matchTopic(
  topics: StudyTopic[],
  domain: string,
  subdomain: string,
): StudyTopic | null {
  const same = topics.filter((t) => t.domain === domain)
  const pool = same.length > 0 ? same : topics
  for (const t of pool) {
    if ((t.match ?? []).some((p) => subdomain.startsWith(p))) return t
  }
  return null
}
