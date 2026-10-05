#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
/**
 * recover-retired-subdomains.mjs — Recupera os subdomínios das 164
 * autoavaliações aposentadas no commit 1d67654.
 *
 * Por que existe: as questões foram DELETADAS dos arquivos de domínio, então
 * `retire_autoeval_ids.json` guardava só os IDs. Sem isso, qualquer lista de
 * subdomínios para repor cobertura é palpite — e cobertura inventada não
 * substitui pergunta aposentada, só infla a contagem.
 *
 * Lê o snapshot do commit PAI (1d67654^) dos arquivos de domínio, cruza com
 * retire_autoeval_ids.json, e agrupa por subdomínio.
 *
 *   node scripts/recover-retired-subdomains.mjs [commit]   default 1d67654^
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const REF = process.argv[2] ?? '1d67654^'
const DATE = new Date().toISOString().slice(0, 10)

const DOMAIN_FILES = [
  'identidade-governanca.json',
  'identidade-acesso.json',
  'storage.json',
  'rede-virtual.json',
  'monitoramento.json',
  'compute-vms.json',
  'compute-apps.json',
  'compute-platform.json',
]

const retireIds = new Set(
  JSON.parse(
    readFileSync(join(ROOT, 'data', 'retire_autoeval_ids.json'), 'utf8'),
  ),
)

// id -> { subdomain, domain, file, question }
const recovered = new Map()
const missing = []

for (const f of DOMAIN_FILES) {
  let raw
  try {
    raw = execFileSync('git', ['show', `${REF}:data/${f}`], {
      cwd: ROOT,
      maxBuffer: 64 * 1024 * 1024,
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL },
    })
  } catch (e) {
    console.error(`AVISO: nao consegui ler ${f} em ${REF}: ${e.message}`)
    continue
  }
  let arr
  try {
    arr = JSON.parse(raw)
  } catch {
    continue
  }
  for (const q of arr) {
    if (!retireIds.has(q.id)) continue
    recovered.set(q.id, {
      subdomain: q.subdomain,
      domain: q.domain,
      file: f,
      type: q.type,
      options: (q.options ?? []).length,
      question: q.question,
      source: q.source,
    })
  }
}

for (const id of retireIds) {
  if (!recovered.has(id)) missing.push(id)
}

// agrupar por subdominio
const bySub = new Map()
for (const [id, r] of recovered) {
  if (!bySub.has(r.subdomain)) {
    bySub.set(r.subdomain, {
      count: 0,
      domain: r.domain,
      file: r.file,
      ids: [],
      types: new Set(),
    })
  }
  const e = bySub.get(r.subdomain)
  e.count++
  e.ids.push(id)
  e.types.add(r.type)
}

const rows = [...bySub.entries()].sort(
  (a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]),
)

// cross-ref com anchor-map
const anchorMap = JSON.parse(
  readFileSync(join(ROOT, 'data', 'anchor-map.json'), 'utf8'),
)

let covered = 0
let uncovered = 0
const uncoveredList = []
for (const [sub, e] of rows) {
  if (sub in anchorMap) covered++
  else {
    uncovered++
    uncoveredList.push([sub, e])
  }
}

const out = []
out.push(`# Subdominios das 164 autoavaliacoes aposentadas — ${DATE}`)
out.push('')
out.push(
  `Fonte: \`${REF}\` (parent do commit que removeu) x \`retire_autoeval_ids.json\``,
)
out.push('')
out.push(`- IDs na lista de aposentadoria: ${retireIds.size}`)
out.push(`- Recuperados: ${recovered.size}`)
out.push(`- NAO recuperados: ${missing.length}`)
out.push(`- Subdominios distintos: ${bySub.size}`)
out.push(`- Com entrada em anchor-map.json: ${covered}`)
out.push(`- SEM entrada em anchor-map.json: ${uncovered}`)
out.push('')

if (missing.length) {
  out.push('## Nao recuperados')
  out.push('')
  for (const id of missing) out.push(`- ${id}`)
  out.push('')
}

out.push('## Subdominios por peso (retirados -> repor)')
out.push('')
out.push('| subdominio | n | dominio | arquivo | tipos | anchor-map |')
out.push('|---|---|---|---|---|---|')
for (const [sub, e] of rows) {
  const has = sub in anchorMap ? 'sim' : '**NAO**'
  out.push(
    `| \`${sub}\` | ${e.count} | ${e.domain} | ${e.file} | ${[...e.types].join('/')} | ${has} |`,
  )
}
out.push('')

if (uncoveredList.length) {
  out.push('## Subdominios aposentados SEM ancora (prioridade de reposicao)')
  out.push('')
  for (const [sub, e] of uncoveredList) {
    out.push(`- \`${sub}\` (${e.count} perguntas, ${e.domain})`)
  }
  out.push('')
}

const auditDir = join(ROOT, '.agent', 'audits')
mkdirSync(auditDir, { recursive: true })
const p = join(auditDir, `retired-subdomains-${DATE}.md`)
writeFileSync(p, `${out.join('\n')}\n`)

// tambem um JSON mecanico, para o gerador de lote consumir
writeFileSync(
  join(auditDir, `retired-subdomains-${DATE}.json`),
  `${JSON.stringify(
    {
      ref: REF,
      total: retireIds.size,
      recovered: recovered.size,
      missing,
      subdomains: rows.map(([sub, e]) => ({
        subdomain: sub,
        count: e.count,
        domain: e.domain,
        file: e.file,
        types: [...e.types],
        anchored: sub in anchorMap,
        anchor: anchorMap[sub] ?? null,
        ids: e.ids,
      })),
    },
    null,
    2,
  )}\n`,
)

console.log(`ref: ${REF}`)
console.log(`IDs na lista: ${retireIds.size}`)
console.log(`Recuperados: ${recovered.size}`)
console.log(`Nao recuperados: ${missing.length}`)
console.log(`Subdominios distintos: ${bySub.size}`)
console.log(`Com anchor-map: ${covered}`)
console.log(`SEM anchor-map: ${uncovered}`)
console.log(`\nTop 15 subdominios aposentados:`)
for (const [sub, e] of rows.slice(0, 15)) {
  console.log(
    `  ${String(e.count).padStart(3)}  ${sub}${sub in anchorMap ? '' : '   <-- SEM ANCORA'}`,
  )
}
console.log(`\nRelatorio: ${p}`)
