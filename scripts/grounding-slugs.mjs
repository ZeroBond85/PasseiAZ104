#!/usr/bin/env node
/**
 * grounding-slugs.mjs — resolve o slug canônico de cada bullet do grounding-map
 * listando os arquivos .md no repositório público de docs da Microsoft e
 * validando o slug correspondente por HTTP em PT-BR.
 *
 *   node scripts/grounding-slugs.mjs          # imprime candidatos verificados
 *   node scripts/grounding-slugs.mjs --write  # grava data/grounding-map.json
 *
 * Fontes consultadas, em ordem de confiança:
 *   1. https://api.github.com/repos/<repo>/contents/<dir>  (nome do arquivo = slug)
 *   2. https://learn.microsoft.com/pt-br/<slug>            (prova: precisa dar 200)
 * O passo 2 é o que importa: sem ele o mapa vira chute (já gerou 404 e
 * redirect para EN-US antes).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const UA = 'PasseiAZ104-grounding-slugs/1.0'
const LEARN = 'https://learn.microsoft.com/pt-br'

const AZURE = 'MicrosoftDocs/azure-docs'
const ENTRA = 'MicrosoftDocs/entra-docs'

/** bulletId -> { dirs: [[repo, dir]], match: regex de filename } */
const PLAN = {
  'ig-entra-users-groups#1': {
    dirs: [[ENTRA, 'articles/identity/users']],
    match: /^(users-create|users-create-user)\.md$/,
  },
  'ig-subscriptions-governance#1': {
    dirs: [[AZURE, 'articles/governance']],
    match: /^policy-overview\.md$/,
  },
  'ig-subscriptions-governance#2': {
    dirs: [[AZURE, 'articles/governance']],
    match: /resource-lock\.md$/,
  },
  'ig-subscriptions-governance#3': {
    dirs: [[AZURE, 'articles/azure-resource-manager/management']],
    match: /tag-resources\.md$/,
  },
  'ig-subscriptions-governance#4': {
    dirs: [[AZURE, 'articles/azure-resource-manager/management']],
    match: /resource-groups-what-are\.md$/,
  },
  'ig-subscriptions-governance#5': {
    dirs: [[AZURE, 'articles/azure-resource-manager/management']],
    match: /subscription-management\.md$/,
  },
  'ig-subscriptions-governance#6': {
    dirs: [[AZURE, 'articles/cost-management/budgets']],
    match: /^(overview|budgets-overview)\.md$/,
  },
  'ig-subscriptions-governance#7': {
    dirs: [[AZURE, 'articles/governance']],
    match: /management-groups-overview\.md$/,
  },
  'st-access#4': {
    dirs: [[AZURE, 'articles/storage/common']],
    match: /storage-account-key.*\.md$/,
  },
  'st-access#5': {
    dirs: [[AZURE, 'articles/storage/files']],
    match: /identity-based.*\.md$/,
  },
  'st-accounts#2': {
    dirs: [[AZURE, 'articles/storage/common']],
    match: /redundancy.*\.md$/,
  },
  'st-accounts#3': {
    dirs: [[AZURE, 'articles/storage/common']],
    match: /storage-object-replication.*\.md$/,
  },
  'st-accounts#5': {
    dirs: [[AZURE, 'articles/storage/common']],
    match: /(storage-explorer|azcopy).*\.md$/,
  },
  'co-arm-bicep#3': {
    dirs: [[AZURE, 'articles/azure-resource-manager/bicep']],
    match: /^modify.*\.md$/,
  },
  'co-arm-bicep#4': {
    dirs: [[AZURE, 'articles/azure-resource-manager/bicep']],
    match: /^(deploy|bicep-cli)\.md$/,
  },
  'co-app-service#3': {
    dirs: [[AZURE, 'articles/app-service']],
    match: /^quickstart-webapp-.*\.md$/,
  },
  'co-app-service#5': {
    dirs: [[AZURE, 'articles/app-service']],
    match: /^(configure-domain|app-service-domain|tutorial-map-domain)\.md$/,
  },
  'co-app-service#7': {
    dirs: [[AZURE, 'articles/app-service']],
    match:
      /^(web-sites-with-vnet|vnet-integration.*|app-service-vnet-integration)\.md$/,
  },
  'rv-secure-access#2': {
    dirs: [
      [AZURE, 'articles/virtual-network'],
      [AZURE, 'articles/network-watcher'],
    ],
    match: /^(nsg.*rule.*|evaluate-nsg.*|nsg-effective.*)\.md$/,
  },
  'rv-secure-access#4': {
    dirs: [[AZURE, 'articles/virtual-network']],
    match: /^service-endpoints.*\.md$/,
  },
  'rv-dns-lb#3': {
    dirs: [[AZURE, 'articles/load-balancer']],
    match: /^(troubleshoot.*|.*troubleshoot.*)\.md$/,
  },
  'mo-backup-recovery#1': {
    dirs: [[AZURE, 'articles/recovery-services-vault']],
    match: /recovery-services-vault.*\.md$/,
  },
  'mo-backup-recovery#3': {
    dirs: [[AZURE, 'articles/backup']],
    match: /backup-policy.*\.md$/,
  },
  'mo-backup-recovery#4': {
    dirs: [[AZURE, 'articles/backup']],
    match: /^(backup-restore|backup-.*restore.*|tutorial.*restore.*)\.md$/,
  },
  'mo-backup-recovery#5': {
    dirs: [[AZURE, 'articles/site-recovery']],
    match: /^(site-recovery-overview|overview|what-is-site-recovery)\.md$/,
  },
  'mo-backup-recovery#7': {
    dirs: [[AZURE, 'articles/backup']],
    match: /(backup-rm-.*|.*back-up-virtual-machines.*|backup-vm.*)\.md$/,
  },
}

const dirCache = new Map()

async function listDir(repo, dir) {
  const key = `${repo}/${dir}`
  if (dirCache.has(key)) return dirCache.get(key)
  let names = []
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/contents/${dir}`,
      {
        headers: {
          'user-agent': UA,
          accept: 'application/vnd.github+json',
        },
        signal: AbortSignal.timeout(25000),
      },
    )
    if (res.status === 200) {
      const json = await res.json()
      names = (Array.isArray(json) ? json : [])
        .filter((n) => n.type === 'file' && n.name.endsWith('.md'))
        .map((n) => n.name)
    } else {
      console.log(`  (github ${res.status} em ${key})`)
    }
  } catch (err) {
    console.log(`  (github erro em ${key}: ${String(err).slice(0, 40)})`)
  }
  dirCache.set(key, names)
  return names
}

async function probe(url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    })
    return { status: res.status, finalUrl: res.url }
  } catch {
    return { status: 0, finalUrl: url }
  }
}

const mode = process.argv.includes('--write') ? 'write' : 'report'
const resolved = {}
const problems = []

for (const [bullet, plan] of Object.entries(PLAN)) {
  const slugs = []
  for (const [repo, dir] of plan.dirs) {
    const names = await listDir(repo, dir)
    // articles/<resto> no repo -> /azure/<resto> ou /entra/<resto> no Learn
    const urlPrefix = repo === ENTRA ? 'entra/' : 'azure/'
    for (const name of names) {
      if (plan.match.test(name)) {
        const rel = `${dir}/${name.replace(/\.md$/, '')}`
          .replace(/^articles\//, '')
          .replace(/\/index$/, '')
        slugs.push(`${urlPrefix}${rel}`)
      }
    }
  }
  if (slugs.length === 0) {
    problems.push(`${bullet}: nenhum arquivo casou ${plan.match}`)
    console.log(`SEM   ${bullet} (nenhum slug candidato)`)
    for (const [repo, dir] of plan.dirs) {
      const names = await listDir(repo, dir)
      const urlPrefix = repo === ENTRA ? 'entra/' : 'azure/'
      console.log(`       ${dir} tem ${names.length} .md; amostra:`)
      names.slice(0, 12).forEach((n) => {
        console.log(
          `         ${urlPrefix}${dir.replace(/^articles\//, '')}/${n.replace(/\.md$/, '')}`,
        )
      })
    }
    continue
  }

  let chosen = null
  for (const slug of slugs) {
    const r = await probe(`${LEARN}/${slug}`)
    const ok =
      r.status === 200 && !/learn\.microsoft\.com\/en-us/.test(r.finalUrl || '')
    if (ok) {
      chosen = slug
      break
    }
  }

  if (!chosen) {
    problems.push(
      `${bullet}: ${slugs.length} candidato(s) todos 404 -> ${slugs.slice(0, 3).join(' , ')}`,
    )
    console.log(`FALHA ${bullet} (${slugs.length} candidatos, nenhum 200)`)
    slugs.slice(0, 6).forEach((s) => {
      console.log(`        ${s}`)
    })
    continue
  }

  console.log(`OK    ${bullet} -> ${chosen}`)
  resolved[bullet] = `${LEARN}/${chosen}`
}

if (mode === 'write' && Object.keys(resolved).length > 0) {
  const mapPath = `${ROOT}/data/grounding-map.json`
  const map = JSON.parse(readFileSync(mapPath, 'utf8'))
  const now = new Date().toISOString()
  for (const [bullet, url] of Object.entries(resolved)) {
    const entry = map.bullets?.[bullet]
    if (entry) {
      entry.url = url
      entry.verifiedAt = now
    }
  }
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`)
  const all = Object.values(map.bullets || {})
  console.log(
    `\ngrounding-map.json: ${all.filter((b) => b.url).length}/${all.length} bullets com URL`,
  )
} else {
  console.log(
    `\nresolvidos: ${Object.keys(resolved).length} | pendencias: ${problems.length}`,
  )
  problems.forEach((p) => {
    console.log(`  ${p}`)
  })
}
