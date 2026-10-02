#!/usr/bin/env node
/**
 * search-grounding.mjs — descobre slugs REAIS usando a API de busca do Learn.
 *
 * A busca devolve URLs en-us; a gente normaliza para o caminho e só aceita o
 * que responde 200 em /pt-br. Isso é sondagem: imprime candidatos e NÃO escreve
 * no mapa. Revise a semântica e, se estiver certo, copie a linha para
 * PRIMARY/EXTRA em `fill-grounding.mjs`.
 *
 *   node scripts/search-grounding.mjs                 # TODOS sem âncora
 *   node scripts/search-grounding.mjs mo-backup-recovery#4
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const UA = 'PasseiAZ104-grounding-search/1.0'
const LEARN = 'https://learn.microsoft.com/pt-br/'
const LOCALES =
  /^\/(en-us|pt-br|es-es|fr-fr|de-de|it-it|ja-jp|ko-kr|ru-ru|zh-cn|zh-tw|nl-nl|pl-pl|tr-tr|cs-cz|sv-se|da-dk|fi-fi|nb-no|pt-pt)(?=\/)/

/** Queries por bullet. Ajuste quando a busca não trouxer nada aproveitável. */
const QUERIES = {
  'ig-entra-users-groups#4': [
    'como convidar usuário convidado B2B Entra External Identities',
  ],
  'ig-subscriptions-governance#4': [
    'resource groups organize Azure subscriptions',
    'criar grupo de recursos portal Azure',
  ],
  'ig-subscriptions-governance#5': [
    'Azure subscriptions management cancel rename',
    'assinatura do Azure overarching container',
  ],
  'st-access#4': [
    'rotate shared access keys storage account',
    'chaves de acesso da conta de armazenamento',
  ],
  'st-access#5': [
    'Azure Files identity based access AD DS Managed identity',
    'identidade Microsoft Entra Azure Files',
  ],
  'st-accounts#3': [
    'storage redundancy geo-zone redundant',
    'GRS GZRS RA-GRS data replication',
  ],
  'st-accounts#5': ['Storage Explorer connect storage accounts desktop'],
  'co-arm-bicep#3': ['bicep existing resource declaration modules'],
  'co-arm-bicep#4': ['Azure Resource Manager template deploy overview'],
  'co-app-service#3': ['create Azure App Service web app quickstart portal'],
  'co-app-service#5': ['map custom domain name App Service certificate'],
  'rv-secure-access#2': [
    'Network Watcher NSG diagnose reachability effective rules',
    'NSG effective security rules portal',
  ],
  'rv-secure-access#4': ['service tags Azure IP address tags'],
  'rv-dns-lb#2': ['Azure load balancer internal public overview create'],
  'mo-backup-recovery#3': [
    'backup policy configure protection frequency retention',
    'cofre dos serviços de recuperação criar política',
  ],
  'mo-backup-recovery#4': [
    'backup restore virtual machine Azure portal tutorial',
    'restaurar máquina virtual backup Azure',
  ],
  'mo-backup-recovery#5': [
    'Azure to Azure disaster recovery site recovery replicate',
  ],
  'mo-backup-recovery#7': [
    'Azure Backup monitoring alerts reports overview',
    'relatório de backup Azure Monitor',
  ],
}

async function search(q) {
  const url =
    `https://learn.microsoft.com/api/search?search=${encodeURIComponent(q)}` +
    `&locale=pt-br&$top=8`
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: AbortSignal.timeout(25000),
    })
    if (!res.ok) return []
    const body = await res.json()
    return (body.results || [])
      .map((r) => String(r.url || ''))
      .map((u) => {
        try {
          return new URL(u).pathname
        } catch {
          return ''
        }
      })
      .map((p) => p.replace(LOCALES, ''))
      .filter((p) => p.startsWith('/'))
      .filter((p) => !/^\/(q&a|answers|training|troubleshoot)\//.test(p))
  } catch {
    return []
  }
}

async function ptBrOk(path) {
  try {
    const res = await fetch(LEARN + path.slice(1), {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    })
    return res.status === 200 && !/learn\.microsoft\.com\/en-us/.test(res.url)
  } catch {
    return false
  }
}

const map = JSON.parse(readFileSync(`${ROOT}/data/grounding-map.json`, 'utf8'))
const filter = process.argv[2]
const targets =
  filter && filter !== '--all'
    ? [
        [
          filter,
          QUERIES[filter] || [filter.replace(/#\d+$/, '').replace(/-/g, ' ')],
        ],
      ]
    : Object.entries(map.bullets)
        .filter(([, v]) => !v.url)
        .map(([k, v]) => [k, QUERIES[k] || [v.label || '']])

for (const [bullet, queries] of targets) {
  const seen = new Set()
  const hits = []
  for (const q of queries) {
    for (const path of await search(q)) {
      if (seen.has(path)) continue
      seen.add(path)
      if (await ptBrOk(path)) hits.push(path.slice(1))
      if (hits.length >= 4) break
    }
    if (hits.length >= 4) break
  }
  console.log(`\n${bullet}  [${queries.join(' / ')}]`)
  if (hits.length === 0) console.log('  (nenhum 200 em pt-br)')
  for (const h of hits) console.log(`  ${h}`)
}
