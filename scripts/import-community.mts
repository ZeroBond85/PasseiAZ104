// import-community.mts — S7 §8: fetch → quarentena → validate (nunca direto ao banco).
// Uso: tsx scripts/import-community.mts --url https://.../questions.json [--out data/quarantine.json]
import { readFileSync, writeFileSync } from 'node:fs'
import { validateQuestion } from '../src/engine/question-schema.js'

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=')
    return [k.replace(/^--/, ''), v ?? '']
  }),
)
const URL = String(args.get('url') ?? '')
const OUT = String(args.get('out') ?? 'data/quarantine.json')

if (!URL) {
  console.error(
    'Uso: tsx scripts/import-community.mts --url https://... [--out data/quarantine.json]',
  )
  process.exit(2)
}

const res = await fetch(URL)
if (!res.ok) {
  console.error(`fetch falhou: HTTP ${res.status}`)
  process.exit(3)
}
const arr = (await res.json()) as unknown[]
if (!Array.isArray(arr)) {
  console.error('resposta não é array — quarentena recusada')
  process.exit(4)
}

const good: unknown[] = []
let bad = 0
for (const q of arr) {
  const r = validateQuestion(q)
  if (r.success) good.push({ ...(q as object), needsReview: true })
  else bad++
}

const outPath = new URL(`../${OUT}`, import.meta.url)
let existing: unknown[] = []
try {
  existing = JSON.parse(readFileSync(outPath, 'utf8'))
} catch {
  existing = []
}
writeFileSync(outPath, `${JSON.stringify([...existing, ...good], null, 2)}\n`)
console.log(
  `quarentena: ${good.length} aceitas (needsReview:true), ${bad} rejeitadas → ${OUT}`,
)
