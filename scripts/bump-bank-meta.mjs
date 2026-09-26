// Regenera countsByDomain + updatedAt de data/meta.json a partir dos data/*.json reais.
// Uso: node scripts/bump-bank-meta.mjs [--check]  (--check: exit 1 se drift, sem escrever).
// Gate anti-drift: `npm run meta:check` roda no `ci` (PLAN-3 Sprint 1).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const DATA = new URL('../data/', import.meta.url)
const META = new URL('../data/meta.json', import.meta.url)
const SKIP = new Set([
  'simulados.json',
  'meta.json',
  'case-studies.json',
  'study-topics.json',
  'exam-syllabus.json',
])

const counts = {}
for (const f of readdirSync(DATA).filter(
  (f) => f.endsWith('.json') && !SKIP.has(f),
)) {
  const arr = JSON.parse(readFileSync(new URL(f, DATA), 'utf8'))
  if (!Array.isArray(arr)) continue
  for (const q of arr) {
    const d = q?.domain
    if (typeof d === 'string') counts[d] = (counts[d] ?? 0) + 1
  }
}

const meta = JSON.parse(readFileSync(META, 'utf8'))
// Ordem canônica = ordem atual do meta (evita falso drift por ordem de chaves).
const ordered = {}
for (const k of Object.keys(meta.countsByDomain)) ordered[k] = counts[k] ?? 0
for (const k of Object.keys(counts)) if (!(k in ordered)) ordered[k] = counts[k]

const before = JSON.stringify(meta.countsByDomain)
const after = JSON.stringify(ordered)
const total = Object.values(ordered).reduce((n, v) => n + v, 0)

if (process.argv.includes('--check')) {
  if (before !== after) {
    console.error(
      `DRIFT meta.json countsByDomain:\n antes: ${before}\n real:  ${after}`,
    )
    process.exit(1)
  }
  console.log(`meta OK: ${after} (total ${total})`)
} else {
  meta.countsByDomain = ordered
  meta.updatedAt = new Date().toISOString()
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`)
  console.log(`meta atualizado: ${after} (total ${total}) @ ${meta.updatedAt}`)
}
