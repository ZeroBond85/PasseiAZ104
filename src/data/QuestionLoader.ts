import { validateQuestion } from '../engine/question-schema.js'
import {
  loadAllQuestions,
  questionsCount,
  seedQuestions,
} from '../sync/IndexedDB.js'

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
  for (const f of files) {
    let arr: unknown[]
    try {
      const res = await fetch(`${base}data/${f}`)
      if (!res.ok) continue
      arr = await res.json()
    } catch {
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
  }
  localStorage.setItem(VERSION_KEY, SEED_VERSION)
  return { seeded: true, count: total }
}

export async function getQuestionPool() {
  const rows = await loadAllQuestions()
  return rows.map((r) => JSON.parse(r.json))
}
