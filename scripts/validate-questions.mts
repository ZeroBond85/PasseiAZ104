// validate-questions.mts — Zod §3 + cross-file (FK caseStudyId, ids únicos, FNV-1a dedup).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateQuestion } from '../src/engine/question-schema.js'

const DATA = new URL('../data/', import.meta.url)
const CASES = new URL('../data/case-studies.json', import.meta.url)

function fnv1a64(s: string): string {
  let h1 = 0xcbf29ce4
  let h2 = 0xcbf29ce4
  const norm = s.toLowerCase().replace(/\s+/g, ' ').trim()
  for (let i = 0; i < norm.length; i++) {
    const c = norm.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619)
    h2 = Math.imul(h2 ^ (c + 31), 16777619)
  }
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  )
}

let errors = 0
let total = 0
const ids = new Set<string>()
const hashes = new Set<string>()
const fail = (msg: string) => {
  errors++
  console.error(`ERRO: ${msg}`)
}

let caseIds = new Set<string>()
try {
  const cases = JSON.parse(readFileSync(CASES, 'utf8'))
  caseIds = new Set(
    (Array.isArray(cases) ? cases : []).map((c: { id: string }) => c.id),
  )
} catch {
  // case-studies.json ainda não existe (S6) — FK validada quando existir
}

const files = readdirSync(DATA).filter(
  (f) =>
    f.endsWith('.json') &&
    ![
      'simulados.json',
      'meta.json',
      'case-studies.json',
      'study-topics.json',
      'exam-syllabus.json',
    ].includes(f),
)
for (const f of files) {
  const arr = JSON.parse(readFileSync(join(DATA.pathname, f), 'utf8'))
  if (!Array.isArray(arr)) {
    fail(`${f}: raiz deve ser array`)
    continue
  }
  for (const q of arr) {
    total++
    const r = validateQuestion(q)
    if (!r.success) {
      fail(
        `${f} ${(q as { id?: string }).id ?? '?'}: ${r.error.issues[0]?.message}`,
      )
      continue
    }
    const id = (q as { id: string }).id
    if (ids.has(id)) fail(`id duplicado: ${id}`)
    ids.add(id)
    const h = fnv1a64(`${(q as { question: string }).question}`)
    if (hashes.has(h)) fail(`conteúdo duplicado (FNV-1a): ${id}`)
    hashes.add(h)
    const qq = q as { type: string; caseStudyId?: string }
    if (
      qq.type === 'case-study' &&
      caseIds.size > 0 &&
      !caseIds.has(qq.caseStudyId ?? '')
    ) {
      fail(`caseStudyId órfão: ${id} → ${qq.caseStudyId}`)
    }
  }
}

console.log(`validate: ${total} questões, ${errors} erros`)
process.exit(errors > 0 ? 1 : 0)
