#!/usr/bin/env node
/**
 * audit-anchor-semantics.mjs — a página é **sobre** o que o bullet diz?
 *
 * Complementar ao `verify-grounding-urls.mjs`, que só prova que a URL responde.
 * Os dois juntos fecham a classe de erro "link válido, assunto errado", que é o
 * mais caro aqui porque passa invisível até alguém estudar pelo link errado —
 * e o caso real existe: `st-accounts#3` ("replicação de objeto") apontava para
 * `storage-redundancy` (redundância LRS/GRS, zero termos de replicação).
 *
 * Como decide: o vocabulário do rótulo do bullet tem que aparecer no TOPO da
 * página (título/H1/descrição). O corpo não conta — corpo enorme casa com
 * qualquer coisa. `termCoverage` também devolve a cobertura do corpo, mas ela
 * serve de contexto: pode ser baixa sem erro (paráfrase).
 *
 *   node scripts/audit-anchor-semantics.mjs            # usa cache de 7 dias
 *   node scripts/audit-anchor-semantics.mjs --no-cache
 *   node scripts/audit-anchor-semantics.mjs co-arm     # só bullets com esse prefixo
 *
 * Sinaliza: URL não-200 e bullet cujo vocabulário não casa no título. Sai 1 se
 * houver suspeito. Relatório completo em `.agent/audits/anchor-audit.json`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import {
  classifyPage,
  fetchPage,
  mapUrls,
  ROOT,
  termCoverage,
} from './lib/anchor-probe.mjs'

/**
 * Bullets cuja âncora está CORRETA mas cujo título não usa o vocabulário do
 * bullet. Entrar aqui exige justificativa escrita — `tests/unit/anchor-checks`
 * reprova entrada sem texto, para que a lista não vire o lugar de se calar o
 * gate. Exceção aprovada continua aparecendo no relatório, só não como suspeito.
 */
const KNOWN_EXCEPTIONS = {
  'ig-subscriptions-governance#4':
    'Não existe página dedicada a grupos de recursos em PT-BR: o slug oficial ' +
    'azure/azure-resource-manager/resource-group-overview responde 301 para esta mesma página ' +
    '(management/overview), que cita "grupo de recursos" 53 vezes. Trocar de âncora pioraria.',
  'rv-vnets#4':
    'Esta É a página oficial de rotas definidas pelo usuário — o slug é ' +
    'virtual-networks-udr-overview. O título usa "roteamento de tráfego de rede virtual" em vez ' +
    'de "rotas definidas pelo usuário". Paráfrase, não âncora errada.',
  'mo-monitor#3':
    'Não existe página do Azure Monitor em PT-BR que traga `render timechart`: os slugs ' +
    'azure/azure-monitor/kusto-query/kql-function-reference, logs/kusto-query-ui, ' +
    'logs/write-queries e logs/get-started-log-queries respondem 404. A pergunta (az104-mo-148) ' +
    'é sobre o operador `render`, e o operador é documentado em kusto/query/render-operator, que é ' +
    'onde "render timechart" aparece literalmente. O rótulo do bullet diz "Azure Monitor" porque o ' +
    'KQL é a linguagem de consulta do Azure Monitor — o operador está ancorado onde ele é ' +
    'documentado, não onde o rótulo do blueprint o menciona.',
}

const noCache = process.argv.includes('--no-cache')
const only =
  process.argv.find((a) => !a.startsWith('-') && a.endsWith('co')) || null
const { urls } = mapUrls()

const rows = []
for (const { bullet, url, label } of urls.filter((u) => u.role === 'primary')) {
  if (only && !bullet.startsWith(only)) continue
  const page = await fetchPage(url, { ttl: noCache ? 0 : undefined })
  const { ok } = classifyPage(page)
  const cov = termCoverage(label, page)
  rows.push({
    bullet,
    label,
    url,
    title: page.title,
    h1: page.h1,
    status: page.status,
    ok,
    ...cov,
  })
  const flag = !ok
    ? ' <<< URL'
    : cov.inTitle.length === 0
      ? ' <<< NAO CASA NO TITULO'
      : ''
  console.log(
    `${cov.titleCov.toFixed(2)} tit | ${cov.descCov.toFixed(2)} desc | ${cov.bodyCov.toFixed(2)} body | ` +
      `${bullet.padEnd(30)} ${(page.title || '').slice(0, 52)}${flag}`,
  )
}

mkdirSync(`${ROOT}.agent/audits`, { recursive: true })
writeFileSync(
  `${ROOT}.agent/audits/anchor-audit.json`,
  JSON.stringify(rows, null, 2),
)

// Só "não casa no título" reprova, e a descrição fica fora do critério de
// propósito: a página de redundância do Armazenamento diz na descrição "os
// dados sejam replicados" e casaria com o bullet de replicação de objeto —
// que é o próprio bug do st-accounts#3 (ver `termCoverage` na lib). Corpo baixo
// com título certo é paráfrase, não erro; se entrar na lista, o relatório vira
// ruído e ninguém lê (LESSONS 30).
// URL reprova sempre, com ou sem exceção: âncora morta não tem justificativa.
const suspects = rows.filter(
  (r) => !r.ok || (r.inTitle.length === 0 && !KNOWN_EXCEPTIONS[r.bullet]),
)
const justified = rows.filter(
  (r) => r.ok && r.inTitle.length === 0 && KNOWN_EXCEPTIONS[r.bullet],
)

console.log(`\n${rows.length} bullets auditados · ${suspects.length} suspeitos`)
for (const s of suspects)
  console.log(`  ${s.bullet} :: ${s.label} :: ${s.title || s.status}`)
for (const j of justified) {
  console.log(`  OK (exceção justificada) ${j.bullet} :: ${j.title}`)
  console.log(`      ${KNOWN_EXCEPTIONS[j.bullet]}`)
}
if (suspects.length > 0) process.exitCode = 1
