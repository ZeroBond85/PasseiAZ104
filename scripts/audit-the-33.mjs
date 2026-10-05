#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
/**
 * audit-the-33.mjs — Identifica e audita as questões adicionadas no commit
 * 1d67654 (o mesmo que aposentou 164).
 *
 * Contexto: o commit misturou duas coisas — removeu 164 autoavaliações e,
 * segundo a narrativa, adicionou 33 substituições. A auditoria anterior
 * mostrou que só 4 das 836 questões atuais estão em subdomínio aposentado,
 * ou seja: as 33 não são reposições. Antes de descartar ou manter, é preciso
 * saber exatamente quais são, se ancoram de verdade e se duplicam algo que
 * já existe.
 *
 *   node scripts/audit-the-33.mjs [commit]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const COMMIT = process.argv[2] ?? '1d67654'
const DATE = new Date().toISOString().slice(0, 10)

const FILES = [
  'identidade-governanca.json',
  'identidade-acesso.json',
  'storage.json',
  'rede-virtual.json',
  'monitoramento.json',
  'compute-vms.json',
  'compute-apps.json',
  'compute-platform.json',
]

const gitShow = (ref, path) =>
  execFileSync('git', ['show', `${ref}:data/${path}`], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'utf8',
  })

const retireIds = new Set(
  JSON.parse(
    readFileSync(join(ROOT, 'data', 'retire_autoeval_ids.json'), 'utf8'),
  ),
)

const anchorMap = JSON.parse(
  readFileSync(join(ROOT, 'data', 'anchor-map.json'), 'utf8'),
)

const before = new Map()
const after = new Map()

for (const f of FILES) {
  for (const [bucket, ref] of [
    [before, `${COMMIT}^`],
    [after, COMMIT],
  ]) {
    let arr
    try {
      arr = JSON.parse(gitShow(ref, f))
    } catch {
      continue
    }
    for (const q of arr) bucket.set(q.id, { ...q, _file: f })
  }
}

const addedIds = [...after.keys()].filter((id) => !before.has(id))
const removedIds = [...before.keys()].filter((id) => !after.has(id))

const added = addedIds.map((id) => after.get(id))
const removed = removedIds.map((id) => before.get(id))

// --- verificacao 1: as adicionadas batem com a lista de aposentadoria? -------
const addedThatWereRetired = added.filter((q) => retireIds.has(q.id))

// --- verificacao 2: campo a campo, o que mudou nas QUESTIONS COMUM ---------
const common = [...after.keys()].filter((id) => before.has(id))
const changed = []
for (const id of common) {
  const a = before.get(id)
  const b = after.get(id)
  const fields = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of fields) {
    if (k === '_file') continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      changed.push({ id, field: k, from: a[k], to: b[k], file: b._file })
    }
  }
}

// --- verificacao 3: as adicionadas tem ancora + grounding? ------------------
const grounding = JSON.parse(
  readFileSync(join(ROOT, 'data', 'grounding-map.json'), 'utf8'),
)
const anchorsOfAdded = added.map((q) => ({
  id: q.id,
  file: q._file,
  subdomain: q.subdomain,
  source: q.source,
  sourceUrl: q.sourceUrl ?? null,
  hasAnchor: q.subdomain in anchorMap,
  anchor: q.subdomain in anchorMap ? anchorMap[q.subdomain] : null,
  urlInGrounding:
    grounding.bullets?.[
      q.subdomain in anchorMap
        ? `${anchorMap[q.subdomain].groupId}#${anchorMap[q.subdomain].bulletIndex + 1}`
        : '?'
    ]?.url ?? null,
  question: q.question,
}))

// --- verificacao 4: duplicata por texto de pergunta em todo o banco ---------
const allNow = []
for (const f of FILES) {
  try {
    for (const q of JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'))) {
      allNow.push({ ...q, _file: f })
    }
  } catch {}
}
const norm = (s) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const byText = new Map()
for (const q of allNow) {
  const k = norm(q.question)
  if (!byText.has(k)) byText.set(k, [])
  byText.get(k).push(q.id)
}
const dupTexts = new Set(
  [...byText.entries()].filter(([, ids]) => ids.length > 1).map(([k]) => k),
)

const report = []
report.push(`# Auditoria das questoes adicionadas em ${COMMIT} — ${DATE}`)
report.push('')
report.push('## Contagem')
report.push('')
report.push(`- Questoes em ${COMMIT}^: ${before.size}`)
report.push(`- Questoes em ${COMMIT}: ${after.size}`)
report.push(`- Adicionadas: ${added.length}`)
report.push(`- Removidas: ${removed.length}`)
report.push(`- Lista de aposentadoria: ${retireIds.size}`)
report.push(
  `- Adicionadas que estao na lista de aposentadoria: ${addedThatWereRetired.length}`,
)
report.push(`- Perguntas comuns cujo algum campo mudou: ${changed.length}`)
report.push('')

report.push('## Adicionadas — ancoragem')
report.push('')
report.push('| id | subdominio | source | sourceUrl | anchor | bullet |')
report.push('|---|---|---|---|---|---|')
for (const a of anchorsOfAdded) {
  const bullet = a.anchor
    ? `${a.anchor.groupId}#${a.anchor.bulletIndex + 1}`
    : '—'
  report.push(
    `| ${a.id} | ${a.subdomain} | ${a.source ?? '—'} | ${
      a.sourceUrl ? 'sim' : '**nao**'
    } | ${a.hasAnchor ? 'sim' : '**nao**'} | ${bullet} |`,
  )
}
report.push('')

const noAnchor = anchorsOfAdded.filter((a) => !a.hasAnchor)
const noUrl = anchorsOfAdded.filter(
  (a) => !a.sourceUrl && a.source === 'mslearn',
)
report.push(`- Adicionadas SEM ancora: ${noAnchor.length}`)
report.push(`- Adicionadas mslearn SEM sourceUrl: ${noUrl.length}`)
report.push('')

report.push('## Texto de pergunta duplicado no banco')
report.push('')
const dupesAmongAdded = anchorsOfAdded.filter((a) =>
  dupTexts.has(norm(a.question)),
)
report.push(
  `- Adicionadas cujo texto ja existe no banco: ${dupesAmongAdded.length}`,
)
for (const d of dupesAmongAdded) report.push(`  - ${d.id} (${d.subdomain})`)
report.push('')

if (changed.length) {
  report.push('## Campos alterados em perguntas pre-existentes')
  report.push('')
  const byField = {}
  for (const c of changed) {
    byField[c.field] ??= []
    byField[c.field].push(c)
  }
  for (const [field, cs] of Object.entries(byField)) {
    report.push(`### ${field} — ${cs.length}`)
    report.push('')
    for (const c of cs.slice(0, 12)) {
      const f = (v) => JSON.stringify(v)?.slice(0, 60) ?? 'undefined'
      report.push(`- ${c.id}: \`${f(c.from)}\` → \`${f(c.to)}\``)
    }
    if (cs.length > 12) report.push(`- … e mais ${cs.length - 12}`)
    report.push('')
  }
}

mkdirSync(join(ROOT, '.agent', 'audits'), { recursive: true })
const p = join(ROOT, '.agent', 'audits', `audit-33-${DATE}.md`)
writeFileSync(p, `${report.join('\n')}\n`)

console.log(
  `Adicionadas: ${added.length} | Removidas: ${removed.length} | Comuns alteradas: ${changed.length}`,
)
console.log(
  `Adicionadas na lista de aposentadoria: ${addedThatWereRetired.length}`,
)
console.log(`Adicionadas SEM ancora: ${noAnchor.length}`)
console.log(`Adicionadas mslearn SEM sourceUrl: ${noUrl.length}`)
console.log(`Texto duplicado entre adicionadas: ${dupesAmongAdded.length}`)
console.log(`\nRelatorio: ${p}`)
