import { validateQuestion } from '../engine/question-schema.js'
import {
  loadAllQuestions,
  questionsCount,
  seedQuestions,
} from '../sync/IndexedDB.js'
import { logger } from '../utils/logger.js'

const VERSION_KEY = 'az104-seed-version'
export const SEED_VERSION = '1'

// ADR-001: fetch() + precache SW + IDB primeiro. Bundle nunca carrega as ~950.
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
    'storage.json',
    'compute-vms.json',
    'compute-apps.json',
    'compute-platform.json',
    'rede-virtual.json',
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
  return { seeded: true, count: total }
}

export async function getQuestionPool() {
  const rows = await loadAllQuestions()
  return rows.map((r) => JSON.parse(r.json))
}
