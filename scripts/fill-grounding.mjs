#!/usr/bin/env node
/**
 * fill-grounding.mjs — preenche o grounding-map com âncoras e páginas de apoio
 * que JÁ foram revisadas semanticamente por humano. Nenhuma URL entra sem
 * HTTP 200 em PT-BR (redirect para /en-us é rejeitado).
 *
 *   node scripts/fill-grounding.mjs
 *
 * Não use para auto-descobrir slugs: `grounding-slugs.mjs` só sugere, e um
 * slug 200 pode ser semanticamente errado (ex.: st-accounts#2 caindo em
 * redundancy-migration). Revise a linha antes de adicionar aqui.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const UA = 'PasseiAZ104-grounding/1.0'
const LEARN = 'https://learn.microsoft.com/pt-br/'

/** bulletId -> url principal (substitui slug que dava 404). */
const PRIMARY = {
  'ig-entra-users-groups#1': `${LEARN}entra/identity/users`,
  'ig-subscriptions-governance#2': `${LEARN}azure/azure-resource-manager/management/lock-resources`,
  'ig-subscriptions-governance#3': `${LEARN}azure/azure-resource-manager/management/tag-resources`,
  'ig-subscriptions-governance#6': `${LEARN}azure/advisor/advisor-overview`,
  'ig-subscriptions-governance#7': `${LEARN}azure/governance/management-groups/overview`,
  'ig-subscriptions-governance#4': `${LEARN}azure/azure-resource-manager/management/overview`,
  'ig-entra-users-groups#4': `${LEARN}entra/external-id/external-identities-overview`,
  // #5 é GERENCIAR ASSINATURAS. `cost-management-billing-overview` é o caixa
  // (H1 "O que é o Faturamento?"), não a assinatura. A auditoria de semântica
  // de âncoras reprovou essa. ARMADILHA: o slug `subscription-transfer` parece
  // o obvious, mas a página é o "hub de transferência de PRODUTO" — 200, PT-BR
  // e semanticamente errada. A única página PT-BR que é mesmo sobre a
  // assinatura é a do ciclo de vida (cancelar/excluir): estreita, mas certa.
  'ig-subscriptions-governance#5': `${LEARN}azure/cost-management-billing/manage/cancel-azure-subscription`,
  'st-access#4': `${LEARN}azure/storage/common/storage-account-keys-manage`,
  'st-access#5': `${LEARN}azure/storage/files/storage-files-active-directory-overview`,
  'co-arm-bicep#3': `${LEARN}azure/azure-resource-manager/bicep/existing-resource`,
  // #3 é INTERPRETAR ATRIBUIÇÕES DE ACESSO; a âncora primária era
  // `role-definitions`, que é a página das DEFINIÇÕES (o que a função permite),
  // não das ATRIBUIÇÕES (quem tem a função, em qual escopo). Reprova na
  // auditoria de semântica. `role-assignments` é a que introduz a atribuição e
  // cobre o eixo de escopo, que é metade do bullet.
  'ig-access-resources#3': `${LEARN}azure/role-based-access-control/role-assignments`,
  // #4 é GERENCIAR GRUPOS DE RECURSOS. A âncora segue `management/overview` e
  // isso é deliberado: não existe página dedicada a grupos de recursos em PT-BR
  // — o slug oficial `azure/azure-resource-manager/resource-group-overview`
  // responde **301 para esta mesma página**, que cita "grupo de recursos" 53
  // vezes. A auditoria de semântica sinaliza por título, e a exceção está
  // justificada em KNOWN_EXCEPTIONS (audit-anchor-semantics.mjs). As 4 slugs
  // candidatos Dedicated (`.../management/resource-groups`,
  // `resource-group-overview`, `manage-resource-groups`, `resource-groups-what-are`)
  // respondem 404 em PT-BR.
  // O quickstart de VM do portal. Estava no mapa sem dono em PRIMARY/EXTRA, ou
  // seja, fora do alcance do fill: foi assim que uma URL injetada sobreviveu ao
  // fill. Toda primária que o R3 depender precisa ter dono aqui.
  'co-vms#1': `${LEARN}azure/virtual-machines/windows/quick-create-portal`,
  'rv-secure-access#2': `${LEARN}azure/network-watcher/effective-security-rules-overview`,
  'mo-backup-recovery#3': `${LEARN}azure/backup/backup-architecture`,
  // #4 é a família D (co-234: DS/DSv2 com suporte a Premium Storage). `vm/sizes`
  // só lista as FAMÍLIAS e menciona dsv2 numa lista de stirngs soltas, sem dizer
  // que a série suporta Premium Storage. A página da família diz "séries dv2 e
  // dsv2" e "você pode anexar SSDs Standard, HDDs Standard, SSDs Premium e
  // Premium SSD v2" — que é literalmente o eixo da questão. /sizes fica como
  // extra em EXTRA.
  'co-vms#4': `${LEARN}azure/virtual-machines/sizes/general-purpose/d-family`,
  // #1 é EXIGIR TAG com efeito Deny (ig-239). `policy/overview` só cita deny de
  // forma genérica e nunca combina com tag. `tutorials/govern-tags` é explícito:
  // "negue os grupos de recursos que não tenham a tag costcenter ... a seguinte
  // regra de política com o efeito negar impede a criação ou atualização".
  'ig-subscriptions-governance#1': `${LEARN}azure/governance/policy/tutorials/govern-tags`,
  // #1 é COMPARTILHAMENTO DE ARQUIVOS (st-179: conta FileStorage suporta só
  // file shares). `storage-how-to-create-file-share` é um HOW-TO de criação e
  // não diz nada sobre tipos de conta. `storage-account-overview` tem a tabela de
  // tipos: "cada tipo é compatível com recursos diferentes" e o Premium é
  // "somente para compartilhamentos de arquivos".
  'st-files-blobs#1': `${LEARN}azure/storage/common/storage-account-overview`,
  // #3 é CONSULTAR E ANALISAR LOGS (mo-148: `render timechart`). O operador
  // `render` é do KQL e só aparece na página do próprio operador; a de
  // "consultas iniciais" traz exemplos, não a tabela de operadores.
  'mo-monitor#3': `${LEARN}kusto/query/render-operator`,
  // #5 é MONITORAR COM INSIGHTS (mo-149: Storage Insights). Não existe slug
  // PT-BR dedicado: `azure/azure-monitor/insights/storage` responde 404. A
  // tabela deste índice lista "Armazenamento / insights do armazenamento do
  // Microsoft Azure ... desempenho, capacidade e disponibilidade". O slug antigo
  // `insights/insights-overview` redireciona (301) para `visualize/`, então
  // aqui entra o canônico e o velho fica de extra para não perder o histórico.
  'mo-monitor#5': `${LEARN}azure/azure-monitor/visualize/insights-overview`,
  // `object-replication-overview` ("Visão geral da replicação de objeto") — o
  // bullet #3 é replicação de OBJETO. Estava em `storage-redundancy`, que é
  // redundância (LRS/GRS) e não contém nenhum termo de replicação de objeto.
  'st-accounts#2': `${LEARN}azure/storage/common/storage-redundancy`,
  'st-accounts#3': `${LEARN}azure/storage/blobs/object-replication-overview`,
  'st-accounts#5': `${LEARN}azure/storage/storage-explorer/vs-azure-tools-storage-manage-with-storage-explorer`,
  // Os 5 bullets de Bicep/ARM com âncora PRIMÁRIA distinta, porque "interpretar",
  // "modificar" e "implantar" não são a mesma página:
  //   #1 interpretar   -> visão geral de modelos (o que é ARM template e Bicep)
  //   #2 modificar ARM -> sintaxe e estrutura do modelo
  //   #3 modificar Bicep-> existing-resource (mais resource-declaration/overview)
  //   #4 implantar     -> modos de implantação (completa vs incremental)
  //   #5 exportar      -> export-template-portal
  // Antes #1 e #4 dividiam `templates/overview`, e colidir com #2 também.
  'co-arm-bicep#1': `${LEARN}azure/azure-resource-manager/templates/overview`,
  'co-arm-bicep#4': `${LEARN}azure/azure-resource-manager/templates/deployment-modes`,
  // `move-region` cobre os três eixos do bullet (grupo de recursos, assinatura
  // e região) e cita o Site Recovery; `move-support-resources` é a lista de
  // tipos de recurso e dava cobertura 0.33 para `az104-co-233`.
  'co-vms#3': `${LEARN}azure/azure-resource-manager/management/move-region`,
  'co-app-service#3': `${LEARN}azure/app-service/overview`,
  'co-app-service#5': `${LEARN}azure/app-service/app-service-web-tutorial-custom-domain`,
  'co-app-service#7': `${LEARN}azure/app-service/configure-vnet-integration-routing`,
  'rv-secure-access#4': `${LEARN}azure/virtual-network/service-tags-overview`,
  'rv-dns-lb#2': `${LEARN}azure/load-balancer/load-balancer-overview`,
  'rv-dns-lb#3': `${LEARN}azure/load-balancer/load-balancer-troubleshoot`,
  'mo-monitor#4': `${LEARN}azure/azure-monitor/alerts/alerts-overview`,
  'mo-backup-recovery#1': `${LEARN}azure/backup/backup-overview`,
  'mo-backup-recovery#4': `${LEARN}azure/backup/backup-azure-arm-restore-vms`,
  'mo-backup-recovery#5': `${LEARN}azure/site-recovery/site-recovery-overview`,
  'mo-backup-recovery#7': `${LEARN}azure/backup/monitor-backup`,
}

/** bulletId -> [urls] */
const EXTRA = {
  'co-vms#1': [`${LEARN}azure/virtual-machines/trusted-launch`],
  // #5 é GERENCIAR OS DISCOS. `managed-disks-overview` é a página de TIPOS de
  // disco (managed/unmanaged, HDD/SSD) e não fala de redundância; a pergunta
  // sobre ZRS síncrono entre zonas só se sustenta em `disks-redundancy`.
  'co-vms#5': [`${LEARN}azure/virtual-machines/disks-redundancy`],
  'co-vms#7': [
    `${LEARN}azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-upgrade`,
  ],
  'co-containers#1': [
    `${LEARN}azure/container-registry/container-registry-geo-replication`,
    `${LEARN}azure/container-registry/container-registry-authentication`,
  ],
  'co-containers#2': [
    `${LEARN}azure/container-instances/container-instances-environment-variables`,
  ],
  'co-containers#3': [`${LEARN}azure/container-apps/revisions`],
  'ig-entra-users-groups#1': [
    `${LEARN}entra/fundamentals/how-to-create-delete-users`,
  ],
  'ig-entra-users-groups#2': [
    `${LEARN}entra/identity/users/groups-restore-deleted`,
  ],
  'ig-access-resources#1': [
    `${LEARN}azure/role-based-access-control/classic-administrators`,
  ],
  // Extras de `ig-access-resources#3`: a âncora primária ficou em
  // `role-assignments` (ver PRIMARY). Estas completam o parágrafo — o fluxo de
  // interpretação prática no portal, o que a função permite (definições) e a
  // introdução ao RBAC. `role-definitions` NÃO é a primária: é a página das
  // definições, não das atribuições.
  'ig-access-resources#3': [
    `${LEARN}azure/role-based-access-control/role-assignments-portal`,
    `${LEARN}azure/role-based-access-control/role-definitions`,
    `${LEARN}azure/role-based-access-control/overview`,
  ],
  'ig-subscriptions-governance#1': [
    `${LEARN}azure/governance/policy/concepts/exemption-structure`,
    // `policy/overview` perdeu o posto de primária (ver PRIMARY) mas segue
    // válida e útil: é onde o efeito deny é descrito em termos gerais.
    `${LEARN}azure/governance/policy/overview`,
  ],
  'st-files-blobs#2': [
    `${LEARN}azure/storage/blobs/storage-blobs-introduction`,
  ],
  'co-vms#4': [
    // `vm/sizes` é a visão geral de FAMÍLIAS e não substitui a página da série.
    `${LEARN}azure/virtual-machines/sizes`,
  ],
  'st-files-blobs#1': [
    // how-to de criação de share: útil como apoio, mas não fala de tipos de conta.
    `${LEARN}azure/storage/files/storage-how-to-create-file-share`,
  ],
  'mo-monitor#3': [`${LEARN}azure/azure-monitor/logs/get-started-queries`],
  'mo-monitor#5': [
    // Slug antigo: responde 301 para `visualize/insights-overview`. Fica
    // registrado porque foi o que o R0 ancorou primeiro.
    `${LEARN}azure/azure-monitor/insights/insights-overview`,
  ],
  // #4 é TABELA DE ROTAS (rv-181 tipos de próximo salto e rv-182 propagação BGP).
  // `udr-overview` é a âncora primária (única página PT-BR de rotas definidas
  // pelo usuário — a auditoria de semântica a reconhece por paráfrase no
  // título). Estas duas sustentam o `disableBgpRoutePropagation`: o par
  // peering/sub-rede é onde a propriedade aparece por nome, e é o que faz
  // `rv-182` passar do limiar 0.5 do gate lexical.
  'rv-vnets#4': [
    `${LEARN}azure/virtual-network/virtual-network-peering-overview`,
    `${LEARN}azure/templates/microsoft.network/virtualnetworks/subnets`,
  ],
  'st-files-blobs#4': [
    `${LEARN}azure/storage/blobs/soft-delete-container-overview`,
  ],
  'rv-vnets#1': [`${LEARN}azure/virtual-network/manage-virtual-network`],
  'mo-monitor#6': [
    // `nsg-flow-logs-overview` fica como página de APOIO porque é a que traz o
    // aviso de aposentadoria (30/09/2027): é dela que sai o "migre para" da
    // explicação de az104-mo-150. A página que descreve o recurso ATUAL é
    // `vnet-flow-logs-overview`, e é a âncora da questão.
    `${LEARN}azure/network-watcher/vnet-flow-logs-overview`,
    `${LEARN}azure/network-watcher/nsg-flow-logs-overview`,
    `${LEARN}azure/network-watcher/network-watcher-packet-capture-overview`,
  ],
  'ig-entra-users-groups#4': [
    `${LEARN}entra/external-id/external-collaboration-settings-configure`,
  ],
  'ig-subscriptions-governance#5': [
    `${LEARN}azure/cost-management-billing/cost-management-billing-overview`,
  ],
  'st-access#5': [
    `${LEARN}azure/storage/files/storage-files-identity-auth-domain-services-enable`,
  ],
  'co-arm-bicep#3': [
    `${LEARN}azure/azure-resource-manager/bicep/resource-declaration`,
    `${LEARN}azure/azure-resource-manager/bicep/overview`,
  ],
  'co-arm-bicep#4': [
    `${LEARN}azure/azure-resource-manager/templates/template-deploy-what-if`,
  ],
  'rv-secure-access#2': [
    `${LEARN}azure/network-watcher/ip-flow-verify-overview`,
    `${LEARN}azure/network-watcher/nsg-diagnostics-overview`,
  ],
  'mo-backup-recovery#3': [
    `${LEARN}azure/backup/backup-create-recovery-services-vault`,
    `${LEARN}azure/backup/backup-azure-files`,
  ],
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

const mapPath = `${ROOT}/data/grounding-map.json`
const map = JSON.parse(readFileSync(mapPath, 'utf8'))
const problems = []
let added = 0

for (const [bullet, url] of Object.entries(PRIMARY)) {
  const entry = map.bullets?.[bullet]
  if (!entry) {
    problems.push(`${bullet}: bullet inexistente no mapa`)
    continue
  }
  const r = await probe(url)
  const ok =
    r.status === 200 && !/learn\.microsoft\.com\/en-us/.test(r.finalUrl || '')
  if (!ok) {
    problems.push(`${bullet}: ${r.status} ${url}`)
    continue
  }
  entry.url = url
  entry.verifiedAt = new Date().toISOString()
  added += 1
  console.log(
    `URL   ${bullet} -> ${url.replace('https://learn.microsoft.com/pt-br/', '')}`,
  )
}

for (const [bullet, urls] of Object.entries(EXTRA)) {
  const entry = map.bullets?.[bullet]
  if (!entry) {
    problems.push(`${bullet}: bullet inexistente no mapa`)
    continue
  }
  entry.extraUrls = entry.extraUrls || []
  for (const url of urls) {
    const r = await probe(url)
    const ok =
      r.status === 200 && !/learn\.microsoft\.com\/en-us/.test(r.finalUrl || '')
    if (!ok) {
      problems.push(`${bullet}: ${r.status} ${url}`)
      continue
    }
    if (!entry.extraUrls.includes(url)) {
      entry.extraUrls.push(url)
      added += 1
    }
    console.log(
      `OK    ${bullet} + ${url.replace('https://learn.microsoft.com/pt-br/', '')}`,
    )
  }
}

// Invariantes de higiene, aplicadas a TODO o mapa e não só ao que este script
// conhece. Um `extraUrl` igual à própria `url` do bullet não acrescenta nada e
// só infla a contagem; sobrou de um `--write` antigo do `verify-grounding-urls`,
// que mantinha uma lista CANDIDATES própria e já divergiu do mapa.
let cleaned = 0
for (const entry of Object.values(map.bullets || {})) {
  if (!Array.isArray(entry.extraUrls)) continue
  const before = entry.extraUrls.length
  const keep = []
  for (const u of entry.extraUrls) {
    if (u === entry.url) continue
    if (keep.includes(u)) continue
    keep.push(u)
  }
  if (keep.length !== before) {
    entry.extraUrls = keep
    cleaned += before - keep.length
    console.log(
      `LIMPA ${entry.groupId}#: ${before} -> ${keep.length} extraUrls`,
    )
  }
}

if (added > 0 || cleaned > 0) {
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`)
  console.log(
    `\n${added} URLs gravadas; ${cleaned} extraUrls redundantes removidas; pendencias: ${problems.length}`,
  )
  problems.forEach((p) => {
    console.log(`  ${p}`)
  })
}
