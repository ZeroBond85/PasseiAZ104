import bundledCaseStudies from '../../data/case-studies.json'
import {
  type CaseStudy,
  CaseStudySchema,
  validateQuestion,
} from '../engine/question-schema.js'
import {
  loadAllQuestions,
  questionsCount,
  seedQuestions,
} from '../sync/IndexedDB.js'
import { logger } from '../utils/logger.js'

const VERSION_KEY = 'az104-seed-version'
export const SEED_VERSION = '2'

// ADR-001: fetch() + precache SW + IDB primeiro. Bundle nunca carrega as ~1000.
export async function ensureSeeded(): Promise<{
  seeded: boolean
  count: number
}> {
  const current = localStorage.getItem(VERSION_KEY)
  const count = await questionsCount().catch(() => 0)
  if (current === SEED_VERSION && count > 0) return { seeded: false, count }

  const files = [
    'identidade-governanca.json',
    'identidade-acesso.json',
    'storage-access.json',
    'storage-accounts.json',
    'storage-files-blobs.json',
    'compute-vms.json',
    'compute-apps.json',
    'compute-platform.json',
    'rede-vnets.json',
    'rede-secure-access.json',
    'rede-dns-lb.json',
    'monitoramento.json',
  ]
  const base = import.meta.env.BASE_URL
  let total = 0
  let ok = 0
  const failures: string[] = []
  for (const f of files) {
    let arr: unknown[]
    try {
      const res = await fetch(`${base}data/${f}`)
      if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`)
      arr = await res.json()
    } catch (err) {
      const msg = `${f}: ${err instanceof Error ? err.message : String(err)}`
      failures.push(msg)
      logger.warn('data', 'falha carregando arquivo do banco', msg)
      continue
    }
    const valid = (Array.isArray(arr) ? arr : []).filter(
      (q) => validateQuestion(q).success,
    )
    await seedQuestions(
      valid.map((q) => ({
        id: (q as { id: string }).id,
        json: JSON.stringify(q),
      })),
    )
    total += valid.length
    ok++
  }
  if (ok !== files.length) {
    throw new Error(
      `seed parcial: ${ok}/${files.length} arquivos — ${failures.join('; ')}. ` +
        `Banco incompleto NÃO foi marcado como seeded; tente "Recarregar banco".`,
    )
  }
  localStorage.setItem(VERSION_KEY, SEED_VERSION)
  poolCache = null
  return { seeded: true, count: total }
}

let poolCache: Question[] | null = null

export async function getQuestionPool(): Promise<Question[]> {
  if (poolCache) return poolCache
  const rows = await loadAllQuestions()
  poolCache = rows.map((r) => JSON.parse(r.json))
  return poolCache
}

let caseStudyCache: Map<string, CaseStudy> | null = null

// Cenários embutidos (2 registros): lookup síncrono, sem fetch nem nova store.
// Falha de curadoria não pode quebrar a questão — retorna undefined.
export function getCaseStudy(id: string | undefined): CaseStudy | undefined {
  if (!id) return undefined
  if (!caseStudyCache) {
    const parsed = CaseStudySchema.array().safeParse(bundledCaseStudies)
    if (!parsed.success) {
      logger.warn('data', 'case-studies.json inválido', parsed.error.message)
      caseStudyCache = new Map()
      return undefined
    }
    caseStudyCache = new Map(parsed.data.map((c) => [c.id, c]))
  }
  return caseStudyCache.get(id)
}

export interface BankMeta {
  updatedAt: string
  total: number
}

let bankMetaCache: BankMeta | null = null

// Metadados do banco p/ sinal de frescor na UI ("atualizado em ...").
// Lê data/meta.json (gerado por bump-bank-meta.mjs); nunca falha visível.
export async function getBankMeta(): Promise<BankMeta | null> {
  if (bankMetaCache) return bankMetaCache
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/meta.json`)
    if (!res.ok) return null
    const meta = await res.json()
    const raw: Record<string, unknown> = meta?.countsByDomain ?? {}
    const counts: Record<string, number> = {}
    for (const [k, v] of Object.entries(raw))
      if (typeof v === 'number') counts[k] = v
    const total = Object.values(counts).reduce((n, v) => n + v, 0)
    bankMetaCache = { updatedAt: String(meta?.updatedAt ?? ''), total }
    return bankMetaCache
  } catch {
    return null
  }
}

// "2026-09-25T..." → "set de 2026" (pt-BR, curto, sem ponto).
export function formatBankDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d
    .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('.', '')
}

// Linha pronta p/ UI ("Banco de 1000 questões em português · atualizado em ...").
// '' = não exibir (falha silenciosa; IDB continua fonte de leitura).
// Nunca anuncia total não semeado: IDB com menos que meta.total = seed pendente.
export async function getBankLine(): Promise<string> {
  const m = await getBankMeta()
  if (!m || m.total <= 0) return ''
  const when = formatBankDate(m.updatedAt)
  if (!when) return ''
  const seeded = await questionsCount().catch(() => 0)
  if (seeded < m.total) return ''
  return `Banco de ${m.total} questões em português · atualizado em ${when}`
}
