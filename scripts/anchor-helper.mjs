#!/usr/bin/env node
/**
 * anchor-helper.mjs — CLI to map "original" questions to official bullets.
 *
 * Uso:
 *   node scripts/anchor-helper.mjs list ig              # lista subdomínios do domínio
 *   node scripts/anchor-helper.mjs map ig rbac          # mostra detalhes + sugere bullet
 *   node scripts/anchor-helper.mjs apply ig --all       # aplica mapeamento existente
 *   node scripts/anchor-helper.mjs stats                # estatísticas gerais
 */
import fs from 'node:fs'

const DOMAIN_FILES = {
  'identidade-governanca': [
    'data/identidade-governanca.json',
    'data/identidade-acesso.json',
  ],
  storage: ['data/storage.json'],
  compute: [
    'data/compute-vms.json',
    'data/compute-apps.json',
    'data/compute-platform.json',
  ],
  'rede-virtual': ['data/rede-virtual.json'],
  monitoramento: ['data/monitoramento.json'],
}

const GROUP_LABELS = {
  'identidade-governanca': {
    'ig-entra-users-groups': [
      'Criar usuários e grupos',
      'Gerenciar propriedades do usuário e do grupo',
      'Gerenciar as licenças no Microsoft Entra ID',
      'Gerenciar usuários externos',
      'Configurar a SSPR (Redefinição de senha por autoatendimento)',
    ],
    'ig-access-resources': [
      'Gerenciar funções internas do Azure',
      'Atribuir funções em escopos diferentes',
      'Interpretar atribuições de acesso',
    ],
    'ig-subscriptions-governance': [
      'Implementar e gerenciar o Azure Policy',
      'Configurar os bloqueios de recursos',
      'Aplicar e gerenciar tags em recursos',
      'Gerenciar grupos de recursos',
      'Gerenciar Assinaturas',
      'Gerenciar custos usando alertas, orçamentos e recomendações do Assistente do Azure',
      'Configurar grupos de gerenciamento',
    ],
  },
  storage: {
    'st-access': [
      'Configurar firewalls e redes virtuais do Armazenamento do Azure',
      'Criar e usar tokens SAS (Assinatura de Acesso Compartilhado)',
      'Configurar políticas de acesso armazenadas',
      'Gerenciar chaves de acesso',
      'Configurar o acesso baseado em identidade para Arquivos do Azure',
    ],
    'st-accounts': [
      'Criar e configurar contas de armazenamento',
      'Configurar a redundância de Armazenamento do Azure',
      'Configurar a replicação de objeto',
      'Configurar a criptografia de conta de armazenamento',
      'Gerenciar dados usando o Gerenciador de Armazenamento do Azure e o AzCopy',
    ],
    'st-files-blobs': [
      'Criar e configurar um compartilhamento de arquivos nos Arquivos do Azure',
      'Criar e configurar um contêiner no Armazenamento de Blobs do Azure',
      'Configurar camadas de armazenamento',
      'Configurar o soft delete para blobs e contêineres',
      'Configurar instantâneos e exclusão temporária para Arquivos do Azure',
      'Configurar o gerenciamento do ciclo de vida de blobs',
      'Configurar o controle de versão de blobs',
    ],
  },
  compute: {
    'co-arm-bicep': [
      'Interpretar um modelo do Azure Resource Manager ou um arquivo Bicep',
      'Modificar um modelo existente do Azure Resource Manager',
      'Modificar um arquivo Bicep existente',
      'Implantar recursos utilizando um modelo do Azure Resource Manager ou um arquivo Bicep',
      'Exportar uma implantação como um modelo do Azure Resource Manager ou converter um modelo do Azure Resource Manager em um arquivo Bicep',
    ],
    'co-vms': [
      'Criar uma máquina virtual',
      'Configurar a criptografia no host para máquinas virtuais do Azure',
      'Mover uma máquina virtual para outro grupo de recursos, assinatura ou região',
      'Gerenciar os tamanhos de máquinas virtuais',
      'Gerenciar os discos de máquinas virtuais',
      'Implantar máquinas virtuais em zonas de disponibilidade e conjuntos de disponibilidade',
      'Implantar e configurar Conjuntos de Dimensionamento de Máquinas Virtuais do Azure',
    ],
    'co-containers': [
      'Criar e gerenciar um Registro de Contêiner do Azure',
      'Provisionar um contêiner usando Instâncias de Contêiner do Azure',
      'Provisionar um contêiner usando Aplicativos de Contêiner do Azure',
      'Gerenciar dimensionamento e escala para contêineres, incluindo Instâncias de Contêiner do Azure e Aplicativos de Contêiner do Azure',
    ],
    'co-app-service': [
      'Provisionar um plano de Serviço de Aplicações',
      'Configurar escalonamento para um Plano de Serviço de Aplicativo',
      'Criar um Serviço de Aplicativo',
      'Configurar certificados e a Segurança da Camada de Transporte (TLS) para um serviço de aplicativo',
      'Mapear um nome DNS personalizado existente para um Serviço de Aplicativo',
      'Configurar backup para um Serviço de Aplicativo',
      'Definir configurações de rede para um serviço de aplicativo',
      'Configurar slots de implantação para um Serviço de Aplicativo',
    ],
  },
  'rede-virtual': {
    'rv-vnets': [
      'Criar e configurar redes virtuais e sub-redes',
      'Criar e configurar o emparelhamento de rede virtual',
      'Configurar endereços IP públicos',
      'Configurar rotas definidas pelo usuário',
      'Solucionar problemas de conectividade de rede',
    ],
    'rv-secure-access': [
      'Criar e configurar NSGs (Grupos de Segurança de Rede) e Grupos de Segurança de Aplicativo',
      'Avaliar as regras de segurança efetivas nos NSGs',
      'Implementar o Azure Bastion',
      'Configurar endereços de serviço para a plataforma como serviço (PaaS) do Azure',
      'Configurar endpoints privados para o Azure PaaS',
    ],
    'rv-dns-lb': [
      'Configurar o DNS do Azure',
      'Configurar um balanceador de carga interno ou público',
      'Solucionar problemas de balanceamento de carga',
    ],
  },
  monitoramento: {
    'mo-monitor': [
      'Interpretar métricas no Azure Monitor',
      'Definir configurações de log no Azure Monitor',
      'Consultar e analisar logs no Azure Monitor',
      'Configurar regras de alerta, grupos de ações e regras de processamento de alertas no Azure Monitor',
      'Configurar e interpretar o monitoramento de máquinas virtuais, contas de armazenamento e redes usando o Azure Monitor Insights',
      'Usar o Observador de Rede do Azure e o Monitor de Conexão',
    ],
    'mo-backup-recovery': [
      'Criar um cofre dos Serviços de Recuperação',
      'Criar um cofre de Backup do Azure',
      'Criar e configurar uma política de backup',
      'Executar operações de backup e restauração usando o Backup do Azure',
      'Configurar o Azure Site Recovery para recursos do Azure',
      'Executar um failover para uma região secundária usando o Site Recovery',
      'Configurar e interpretar relatórios e alertas para backups',
    ],
  },
}

const MAP_FILE = 'data/anchor-map.json'

function loadMap() {
  if (fs.existsSync(MAP_FILE)) {
    return JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'))
  }
  return {}
}

function loadQuestions(domain) {
  const files = DOMAIN_FILES[domain]
  const all = []
  files.forEach((f) => {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'))
    d.filter((q) => q.source === 'original').forEach((q) => {
      all.push({ ...q, _file: f })
    })
  })
  return all
}

function listSubdomains(domain) {
  const qs = loadQuestions(domain)
  const counts = new Map()
  for (const q of qs) {
    counts.set(q.subdomain, (counts.get(q.subdomain) || 0) + 1)
  }
  console.log(
    `Domínio ${domain}: ${qs.length} questões "original", ${counts.size} subdomínios únicos`,
  )
  for (const [s, c] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s}: ${c}`)
  }
}

function showGroups(domain) {
  const groups = GROUP_LABELS[domain]
  if (!groups) {
    console.log('Domínio desconhecido')
    return
  }
  for (const [gid, bullets] of Object.entries(groups)) {
    console.log(`\n${gid} (${bullets.length} bullets):`)
    for (let i = 0; i < bullets.length; i++) {
      console.log(`  ${i + 1}. ${bullets[i]}`)
    }
  }
}

function suggestMapping(subdomain, domain) {
  const groups = GROUP_LABELS[domain]
  const s = subdomain.toLowerCase()
  let best = { group: null, bullet: null, score: 0 }

  for (const [gid, bullets] of Object.entries(groups)) {
    for (let bi = 0; bi < bullets.length; bi++) {
      const bullet = bullets[bi]
      const words = bullet
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
      let score = 0
      for (const w of words) {
        if (s.includes(w)) score += 2
      }
      if (s.includes('rbac') && gid === 'ig-access-resources') score += 5
      if (s.includes('mfa') && gid === 'ig-entra-users-groups') score += 5
      if (s.includes('sspr') && gid === 'ig-entra-users-groups') score += 5
      if (s.includes('policy') && gid === 'ig-subscriptions-governance')
        score += 5
      if (s.includes('lock') && gid === 'ig-subscriptions-governance')
        score += 5
      if (s.includes('pim') && gid === 'ig-entra-users-groups') score += 5
      if (s.includes('entra-id') && gid === 'ig-entra-users-groups') score += 5
      if (s.includes('rbac') && gid === 'ig-access-resources') score += 5
      if (s.includes('tag') && gid === 'ig-subscriptions-governance') score += 5
      if (s.includes('subscription') && gid === 'ig-subscriptions-governance')
        score += 5
      if (s.includes('cost') && gid === 'ig-subscriptions-governance')
        score += 5
      if (
        s.includes('management-group') &&
        gid === 'ig-subscriptions-governance'
      )
        score += 5
      if (score > best.score)
        best = { group: gid, bullet: bi, score, bulletText: bullet }
    }
  }

  return best
}

function mapCommand(domain, subdomain) {
  const qs = loadQuestions(domain).filter((q) => q.subdomain === subdomain)
  if (!qs.length) {
    console.log('Nenhuma questão com esse subdomínio')
    return
  }

  console.log(`\n${qs.length} questão(ões) em ${domain} / ${subdomain}:`)
  for (let i = 0; i < qs.length; i++) {
    console.log(`  ${i + 1}. ${qs[i].id} — ${qs[i].question.slice(0, 100)}...`)
  }

  const groups = GROUP_LABELS[domain]
  console.log('\nGrupos disponíveis:')
  for (const [gid, bullets] of Object.entries(groups)) {
    console.log(`  ${gid}:`)
    for (let i = 0; i < bullets.length; i++) {
      console.log(`    ${i + 1}. ${bullets[i]}`)
    }
  }

  const suggestion = suggestMapping(subdomain, domain)
  if (suggestion.group) {
    console.log(
      `\nSugestão automática: ${suggestion.group} → bullet ${suggestion.bullet + 1} (${suggestion.bulletText}) [score ${suggestion.score}]`,
    )
  }
}

function loadAllQuestions(domain) {
  const files = DOMAIN_FILES[domain]
  const all = []
  files.forEach((f) => {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'))
    d.forEach((q) => {
      all.push({ ...q, _file: f })
    })
  })
  return all
}

function applyMappings(domain) {
  const map = loadMap()
  const files = DOMAIN_FILES[domain]
  let updated = 0

  files.forEach((f) => {
    const fileData = JSON.parse(fs.readFileSync(f, 'utf8'))
    let fileUpdated = false

    fileData.forEach((q) => {
      if (map[q.subdomain] && q.source === 'original') {
        const m = map[q.subdomain]
        q.source = 'mslearn'
        q.sourceUrl = m.url
        q.updatedAt = new Date().toISOString()
        fileUpdated = true
        updated++
      }
    })

    if (fileUpdated) {
      writeFileSync(f, JSON.stringify(fileData, null, 2))
    }
  })

  console.log(`Atualizadas ${updated} questões em ${domain}`)
  if (updated > 0) {
    console.log("Execute 'npm run grounding:fill' para regenerar o mapa")
  }
}

function applyAll() {
  Object.keys(DOMAIN_FILES).forEach(applyMappings)
}

function stats() {
  for (const d of Object.keys(DOMAIN_FILES)) {
    const qs = loadAllQuestions(d)
    const orig = qs.filter((q) => q.source === 'original').length
    const mslearn = qs.filter((q) => q.source === 'mslearn').length
    console.log(
      `${d}: ${orig} original + ${mslearn} mslearn = ${orig + mslearn} total`,
    )
  }
  const map = loadMap()
  console.log(`\nMapeamentos salvos: ${Object.keys(map).length}`)
}

const [, , cmd, domain, subdomain, _flag] = process.argv

if (cmd === 'list') listSubdomains(domain)
else if (cmd === 'groups') showGroups(domain)
else if (cmd === 'map') mapCommand(domain, subdomain)
else if (cmd === 'apply') applyMappings(domain)
else if (cmd === 'apply-all') applyAll()
else if (cmd === 'stats') stats()
else if (cmd === 'suggest') {
  const map = loadMap()
  const qs = loadQuestions(domain)
  const bySub = new Map()
  for (const q of qs) {
    if (!bySub.has(q.subdomain)) bySub.set(q.subdomain, [])
    bySub.get(q.subdomain).push(q)
  }
  for (const [sub, qsSub] of bySub.entries()) {
    if (map[sub]) continue
    const s = suggestMapping(sub, domain)
    console.log(
      `${sub} (${qsSub.length} q) → ${s.group || '?'} / ${s.bullet !== null ? s.bullet + 1 : '?'} [${s.score}]`,
    )
  }
} else {
  console.log(`
Uso:
  node scripts/anchor-helper.mjs list <dominio>
  node scripts/anchor-helper.mjs groups <dominio>
  node scripts/anchor-helper.mjs map <dominio> <subdominio>
  node scripts/anchor-helper.mjs suggest <dominio>    # sugestões para todos sem mapa
  node scripts/anchor-helper.mjs apply <dominio>      # aplica mapeamentos salvos
  node scripts/anchor-helper.mjs apply-all            # aplica em todos domínios
  node scripts/anchor-helper.mjs stats
`)
}
