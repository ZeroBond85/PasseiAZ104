// build-simulados.mts — S7: N simulados oficiais (fixed, 50q, 12/9/12/10/7 + 1 case contíguo).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SimuladoSchema } from '../src/engine/question-schema.js'

const QUOTAS: Record<string, number> = {
  'identidade-governanca': 12,
  storage: 9,
  compute: 12,
  'rede-virtual': 10,
  monitoramento: 7,
}
const N = Number(process.argv[2] ?? 10)

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DATA = new URL('../data/', import.meta.url)
const pool: Record<string, { id: string; caseStudyId?: string }[]> = {}
for (const f of readdirSync(DATA).filter(
  (x) =>
    x.endsWith('.json') &&
    !['simulados.json', 'meta.json', 'case-studies.json'].includes(x),
)) {
  const arr = JSON.parse(readFileSync(join(DATA.pathname, f), 'utf8'))
  for (const q of arr) {
    const d = q.domain as string
    pool[d] ??= []
    pool[d].push({
      id: q.id as string,
      caseStudyId: q.caseStudyId as string | undefined,
    })
  }
}

const simulados = []
for (let s = 0; s < N; s++) {
  const rand = mulberry32(1000 + s)
  const picked: string[] = []
  const used = new Set<string>()
  // 1 case completo contíguo (alterna entre os cases disponíveis)
  const cased = Object.values(pool)
    .flat()
    .filter((q) => q.caseStudyId)
  const caseIds = [...new Set(cased.map((q) => q.caseStudyId as string))].sort()
  const chosenCase = caseIds[s % caseIds.length]
  const caseQs = cased.filter((q) => q.caseStudyId === chosenCase)
  for (const q of caseQs) {
    picked.push(q.id)
    used.add(q.id)
  }
  // Restante na distribuição (desconta o domínio do case usado)
  const caseDomain =
    Object.entries(pool).find(([, v]) =>
      v.some((q) => q.caseStudyId === chosenCase),
    )?.[0] ?? ''
  for (const [domain, quota] of Object.entries(QUOTAS)) {
    let need = quota - (domain === caseDomain ? caseQs.length : 0)
    const candidates = (pool[domain] ?? []).filter(
      (q) => !q.caseStudyId && !used.has(q.id),
    )
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      const tmp = candidates[i]
      candidates[i] = candidates[j]
      candidates[j] = tmp
    }
    for (const q of candidates) {
      if (need <= 0) break
      picked.push(q.id)
      used.add(q.id)
      need--
    }
  }
  // Embaralha fora do bloco do case (case fica contíguo no fim)
  const head = picked.slice(0, picked.length - caseQs.length)
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = head[i]
    head[i] = head[j]
    head[j] = tmp
  }
  const ids = [...head, ...picked.slice(picked.length - caseQs.length)]
  const sim = {
    mode: 'fixed',
    id: `sim-oficial-${String(s + 1).padStart(2, '0')}`,
    title: `Simulado Oficial ${s + 1}`,
    questionIds: ids,
    timeLimitMinutes: 100,
  }
  const parsed = SimuladoSchema.safeParse(sim)
  if (!parsed.success) {
    console.error(
      `sim ${s + 1} inválido: ${parsed.error.issues[0]?.message} (ids=${ids.length})`,
    )
    process.exit(1)
  }
  simulados.push(sim)
}

writeFileSync(
  join(DATA.pathname, 'simulados.json'),
  `${JSON.stringify(simulados, null, 2)}\n`,
)
console.log(`OK: ${simulados.length} simulados oficiais em data/simulados.json`)
