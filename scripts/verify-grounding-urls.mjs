#!/usr/bin/env node
/**
 * verify-grounding-urls.mjs — sonda por HTTP **as URLs do grounding-map** e
 * reprova as que não são uma página viva de PT-BR.
 *
 * Por que este script é map-driven: a versão anterior mantinha uma lista
 * `CANDIDATES` paralela e ela divergiu do mapa em dozens de entradas — entre
 * elas as quatro âncoras que a auditoria de semântica acabou de corrigir. Com
 * `--write`, ela sobrescreveria as correções. Duas fontes de verdade para o
 * mesmo dado é como o `st-accounts#3` (âncora de "replicação de objeto" numa
 * página de redundância) conseguiu passar por todo gate. Agora há uma só: o
 * mapa. Candidata nova entra por `fill-grounding`, não aqui.
 *
 * O que este script NÃO faz (e é o `audit-anchor-semantics.mjs`):
 * responder se a página é *sobre* o que o bullet diz. URL viva não é âncora
 * certa — as duas verificações são complementares e nenhuma basta sozinha.
 *
 *   node scripts/verify-grounding-urls.mjs            # reporta, exit 1 se houver problema
 *   node scripts/verify-grounding-urls.mjs --no-cache # ignora o cache de 7 dias
 *
 * Não tem `--write` de propósito: escrita no mapa é responsabilidade exclusiva
 * do `fill-grounding.mjs`, para não haver dois autores do mesmo arquivo.
 */
import { classifyPage, fetchPage, mapUrls } from './lib/anchor-probe.mjs'

const noCache = process.argv.includes('--no-cache')
const { urls } = mapUrls()

// Uma URL repetida não precisa ser buscada duas vezes.
const unique = [...new Set(urls.map((u) => u.url))]
const usage = new Map()
for (const u of urls) {
  if (!usage.has(u.url)) usage.set(u.url, [])
  usage.get(u.url).push(`${u.bullet} (${u.role})`)
}

const problems = []
let fetched = 0
let cached = 0
let okCount = 0

for (const url of unique) {
  const page = await fetchPage(url, { ttl: noCache ? 0 : undefined })
  if (page.cached) cached += 1
  else fetched += 1

  const { ok, reasons } = classifyPage(page)
  if (ok) okCount += 1
  else {
    const where = usage.get(url).join(', ')
    for (const r of reasons) problems.push(`${r}\n      usado em: ${where}`)
  }
  process.stdout.write(ok ? '.' : 'X')
}

console.log('')
console.log(
  `grounding-map: ${unique.length} URLs únicas (${urls.length} referências) · ` +
    `${fetched} buscadas · ${cached} do cache`,
)
console.log(`  URLs vivas em PT-BR: ${okCount}/${unique.length}`)

if (problems.length === 0) {
  console.log(
    'OK: toda URL do mapa responde 200 em PT-BR, sem soft-404 e sem cair em EN-US',
  )
} else {
  console.log(`\n${problems.length} problema(s):`)
  for (const p of problems) console.log(`  ${p}`)
  process.exitCode = 1
}
