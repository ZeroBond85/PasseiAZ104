// check-readme-claims.mjs — Gate 0.5: verifica claims numéricos no README
import { readFileSync } from 'node:fs'
import { globSync } from 'glob'

const readme = readFileSync('README.md', 'utf8')

// 1. Conta real do banco
const SKIP = new Set([
  'simulados.json',
  'meta.json',
  'case-studies.json',
  'study-topics.json',
  'exam-skills.json',
  'exam-syllabus.json',
  'grounding-map.json',
  'anchor-map.json',
  'retire_autoeval_ids.json',
  '.generation-state.json',
])
const bankFiles = globSync('data/*.json').filter(
  (f) => !SKIP.has(f.split('/').pop()),
)
let total = 0
const types = { single: 0, multiple: 0, 'case-study': 0 }
let sourceUrl = 0
for (const f of bankFiles) {
  const arr = JSON.parse(readFileSync(f, 'utf8'))
  if (!Array.isArray(arr)) continue
  for (const q of arr) {
    if (!q?.id) continue
    total++
    if (Object.hasOwn(types, q.type)) types[q.type]++
    if (q.sourceUrl) sourceUrl++
  }
}

const pct = {}
for (const [t, n] of Object.entries(types))
  pct[t] = Math.round((n / total) * 1000) / 10 // 1 decimal

let errors = 0

function check(regex, expected, label) {
  const m = readme.match(regex)
  if (!m) {
    console.error(`❌ ${label}: padrão não encontrado no README`)
    errors++
    return
  }
  const found = m[1].trim()
  if (found !== String(expected)) {
    console.error(`❌ ${label}: esperado "${expected}", encontrado "${found}"`)
    errors++
  } else {
    console.log(`✅ ${label}: ${found}`)
  }
}

// Tipos (1 decimal)
check(/escolha única \(([\d.]+)%\)/, pct.single, 'Tipo single %')
check(/múltipla escolha \(([\d.]+)%\)/, pct.multiple, 'Tipo multiple %')
check(/case study \(([\d.]+)%\)/, pct['case-study'], 'Tipo case-study %')

// sourceUrl
check(/(\d+) das 1000.*sourceUrl/, sourceUrl, 'sourceUrl count')

// Total questions
check(/(\d+) questões autorais/, total, 'Total questions')

if (errors > 0) {
  console.error(`\n❌ ${errors} claim(s) incorreto(s) no README`)
  process.exit(1)
} else {
  console.log('\n✅ Todos os claims do README conferem')
}
