#!/usr/bin/env node
/**
 * replace-meta-8.mjs — Substitui as 8 perguntas de metaconteudo do repo que
 * entraram no banco em G16 (az104-st-162/163/165/166/167/168/169/170).
 *
 * Por que: elas descreviam o proprio projeto (service worker, symlink
 * public/data, pre-commit de 200KB, hash FNV-1a, needsReview, Zod). O schema
 * valida forma, nao escopo, entao passaram no validate -- e nenhuma delas e
 * materia de AZ-104. Substituidas por conteudo real de storage, com sourceUrl
 * que precisa existir em data/grounding-map.json (R2).
 *
 *   node scripts/replace-meta-8.mjs --dry-run   # so o plano
 *   node scripts/replace-meta-8.mjs             # aplica
 *
 * Idempotente: aborta se rodar duas vezes, comparando com o trecho de
 * metaconteudo esperado em cada pergunta alvo.
 * needsReview:true porque sao escritas por mim, nao extraidas de fonte --
 * a confirmacao semantica fica humana.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { replaceItem } from './json-append.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DRY = process.argv.includes('--dry-run')

const SUBSTITUICOES = [
  {
    alvo: 'az104-st-198',
    era: 'az104-st-162',
    metaconteudo: 'app carrega questões do IDB semeado',
    novoSubdomain: 'soft-delete-recuperacao',
    pergunta:
      'Uma equipe guarda contratos de clientes em um contêiner de blobs e quer recuperá-los depois de uma exclusão acidental, sem restaurar o contêiner inteiro. Qual recurso do serviço de Blob atende a esse caso?',
    correta:
      'Exclusão suave (soft delete), que retém o blob excluído por um período configurável antes da remoção definitiva',
    erradas: [
      'Redundância GZRS, que mantém uma segunda cópia viva em outra região',
      'Versionamento de blob, que impede a remoção física de qualquer versão',
      'Replicação de objetos, que copia o blob para outra conta de armazenamento',
    ],
    explicacao:
      'A exclusão suave do serviço de Blob retém os dados excluídos por um período definido na conta e permite restaurá-los antes da remoção definitiva. É proteção contra exclusão acidental, não contra perda de datacenter. A redundância GZRS trata de disponibilidade; a replicação de objetos copia blobs entre contas; e o versionamento mantém o histórico de alterações, mas uma versão pode ser removida por operação explícita.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/blobs/soft-delete-blob-overview',
    tags: ['soft-delete', 'blob', 'st-files-blobs'],
  },
  {
    alvo: 'az104-st-199',
    era: 'az104-st-163',
    metaconteudo: 'o bundle baixa as 900 questões',
    novoSubdomain: 'versioning-blob',
    pergunta:
      'Um analista precisa consultar todas as versões pelas quais um blob passou ao longo de meses. Qual recurso do serviço de Blob atende a esse requisito?',
    correta:
      'O versionamento de blobs, que mantém e expõe todas as versões anteriores de cada blob',
    erradas: [
      'A exclusão suave, que restaura apenas a versão mais recente do blob',
      'As camadas de acesso, que movem o blob entre os níveis quente, frio e arquivo',
      'O ciclo de vida, que arquiva o blob automaticamente conforme a idade',
    ],
    explicacao:
      'O versionamento de blobs mantém cada versão gravada de um blob, permitindo listar e ler as versões anteriores, e pode ser combinado com a exclusão suave para recuperar uma versão específica. As camadas de acesso e as políticas de ciclo de vida atuam sobre a versão atual do blob e não preservam o histórico de alterações.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/blobs/versioning-overview',
    tags: ['versioning', 'blob', 'st-files-blobs'],
  },
  {
    alvo: 'az104-st-201',
    era: 'az104-st-165',
    metaconteudo: 'o service worker faz precache dos JSONs',
    novoSubdomain: 'access-tiers-blob',
    pergunta:
      'O dono de um blob quer reduzir o custo das leituras frequentes sem perder a durabilidade dos dados. Para qual camada ele deve promover o blob recém-gravado?',
    correta:
      'Camada quente (Hot), que é a camada padrão para dados acessados com frequência',
    erradas: [
      'Camada fria (Cool), que é a camada padrão para dados acessados raramente',
      'Camada arquivo (Archive), que é a camada padrão para dados acessados esporadicamente',
      'Camada fria (Cool), que passa a ser a padrão depois de trinta dias sem leitura',
    ],
    explicacao:
      'A camada quente é a padrão e tem o menor preço por transação e por leitura, indicada para dados acessados com frequência. A fria é a padrão para acesso mensal ou pouco frequente, e a arquivo o padrão para acesso esporádico, com reidratação em horas. A troca de camada ocorre quando o blob é lido ou escrito, não por tempo de repouso, e uma conta nova define os padrões quente, fria e arquivo nessa ordem.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/blobs/access-tiers-overview',
    tags: ['access-tiers', 'blob', 'st-files-blobs'],
  },
  {
    alvo: 'az104-st-202',
    era: 'az104-st-166',
    metaconteudo: 'é symlink para ../data',
    novoSubdomain: 'anonymous-network-security',
    pergunta:
      'Uma conta de armazenamento tem o acesso anônimo habilitado no serviço de Blob e, ao mesmo tempo, uma regra de firewall que restringe o acesso à rede virtual corporativa. Como as duas configurações se combinam?',
    correta:
      'As duas coexistem: o acesso anônimo se aplica a quem já estiver autorizado pela regra de rede',
    erradas: [
      'O acesso anônimo é desativado automaticamente ao criar a regra de firewall',
      'A regra de firewall é ignorada para qualquer requisição anônima',
      'O acesso anônimo exige desabilitar a proteção por chave de conta',
    ],
    explicacao:
      'As regras de rede de uma conta de armazenamento se aplicam a todas as requisições, anônimas ou autenticadas. Habilitar o acesso anônimo permite ler um contêiner sem Shared Access Signature, mas a avaliação da rede continua valendo: um cliente fora da faixa autorizada é bloqueado mesmo em contêiner com acesso anônimo. O acesso anônimo nunca ignora a regra de rede.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/blobs/anonymous-read-access-configure',
    tags: ['anonymous', 'network-security', 'st-access'],
  },
  {
    alvo: 'az104-st-203',
    era: 'az104-st-167',
    metaconteudo: 'acima de 200KB falha o pre-commit',
    novoSubdomain: 'account-keys-rotacao',
    pergunta:
      'Uma aplicação acessa um serviço de armazenamento usando a chave da conta e o time quer reduzir a exposição dessa credencial sem adotar Shared Access Signature. Qual prática a Microsoft recomenda?',
    correta:
      'Guardar a chave em um cofre de chaves e rotacioná-la periodicamente',
    erradas: [
      'Publicar a chave como variável de ambiente no repositório para facilitar a leitura',
      'Desabilitar o acesso à rede pública da conta para eliminar a necessidade da chave',
      'Gerar uma subchave da conta para cada aplicação cliente',
    ],
    explicacao:
      'A chave de conta equivale a uma senha de administrador: quem a possui tem acesso total à conta. A recomendação é mantê-la fora do código, em um cofre de chaves, e rotacioná-la; para acesso com escopo restrito, preferir Shared Access Signature. Desabilitar o acesso à rede pública não substitui a proteção da chave e aumenta o impacto de um vazamento dela.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/common/storage-account-keys-manage',
    tags: ['keys', 'security', 'st-access'],
  },
  {
    alvo: 'az104-st-204',
    era: 'az104-st-168',
    metaconteudo: 'detecta questão duplicada por hash FNV-1a',
    novoSubdomain: 'replicacao-geografica',
    pergunta:
      'Uma organização quer resiliência geográfica de seus blobs e mantém contas de armazenamento em regiões diferentes. Qual recurso copia os objetos de forma nativa entre essas contas?',
    correta:
      'A replicação de objetos, que replica as operações de blob entre contas de origem e destino',
    erradas: [
      'A exclusão suave, que retém o blob na conta de origem por um período',
      'O Azure Files com Active Directory, que autentica o acesso ao compartilhamento de arquivos',
      'O Storage Explorer, que gerencia as contas pelo portal ou pela IDE',
    ],
    explicacao:
      'A replicação de objetos mantém contas de armazenamento sincronizadas, propagando blobs de origem para contas de destino em outras regiões, e atende a requisitos de ressiliência geográfica e de recuperação de desastre. A exclusão suave é proteção contra exclusão; o Azure Files com Active Directory é autenticação do compartilhamento; e o Storage Explorer é ferramenta de gerenciamento.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/blobs/object-replication-overview',
    tags: ['replication', 'dr', 'st-accounts'],
  },
  {
    alvo: 'az104-st-205',
    era: 'az104-st-169',
    metaconteudo: 'entra no banco sem revisão quando o WIP estoura',
    novoSubdomain: 'service-encryption',
    pergunta:
      'O time de segurança quer que os dados em repouso de uma conta de armazenamento sejam criptografados com uma chave sob controle da organização. Qual opção atende a esse requisito?',
    correta:
      'A criptografia com chave gerenciada pelo cliente, fornecida por um cofre de chaves da organização',
    erradas: [
      'A criptografia padrão da conta, que já impede o administrador da conta de ler os dados',
      'O TLS em trânsito, que criptografa os dados enquanto trafegam pela rede',
      'A criptografia com chave gerenciada pela Microsoft, que já é o padrão da conta',
    ],
    explicacao:
      'Todas as contas de armazenamento são criptografadas em repouso com AES-256 e isso não pode ser desativado; o que muda entre as opções é quem controla a chave. Na chave gerenciada pela Microsoft, padrão da conta, quem rotaciona é a Microsoft. Na chave gerenciada pelo cliente, guardada em um cofre de chaves ou em um HSM gerenciado, a organização controla a chave e a rotação, e pode revogar o acesso; as operações de criptografia e descriptografia continuam sendo executadas pelo serviço. O TLS protege apenas o trânsito e não se aplica a dados em repouso.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/common/storage-service-encryption',
    tags: ['encryption', 'compliance', 'st-accounts'],
  },
  {
    alvo: 'az104-st-206',
    era: 'az104-st-170',
    metaconteudo: 'é rejeitada pelo schema Zod no validate',
    novoSubdomain: 'azure-files-entra',
    pergunta:
      'O time de segurança precisa de um compartilhamento de arquivos do Azure cujas permissões sejam controladas pelo domínio do Active Directory, com grupos do domínio e herança de ACLs. Qual recurso atende a esse requisito?',
    correta: 'O Azure Files com integração do Active Directory Domain Services',
    erradas: [
      'Um compartilhamento de arquivos do Azure com autenticação por chave de conta',
      'Um contêiner de blobs com acesso anônimo habilitado',
      'Uma fila de Armazenamento com autenticação por Shared Access Signature de conta',
    ],
    explicacao:
      'O Azure Files com Active Directory Domain Services, via SMB, atribui permissões no nível de arquivo a entidades de segurança do diretório, o que permite usar grupos do domínio e herança de ACLs no estilo NTFS. A chave de conta e o acesso anônimo não têm noção de identidade de usuário nem de grupo, e a integração com AD local exige sincronização híbrida. Para a configuração SMB com integração de identidade, é necessário AD Domain Services.',
    sourceUrl:
      'https://learn.microsoft.com/pt-br/azure/storage/files/storage-files-active-directory-overview',
    tags: ['azure-files', 'entra', 'st-access'],
  },
]

/**
 * Gabarito distribuido: as 8 substituições entram com A/B/C/D rotacionados.
 * Todas em A somariam 8 pontos so na letra A e criariam um padrão que o
 * usuario aprende ("questao nova de storage = A"), que e exatamente o atalho
 * que a distribuicao de gabarito existe para impedir.
 */
const LETRAS = ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D']
const gabaritoDe = new Map(SUBSTITUICOES.map((s, i) => [s.alvo, LETRAS[i]]))

/** Monta as 4 opcoes com a correta na letra pedida e as erradas nas outras. */
function opcoesCom(letra, s) {
  const restantes = ['A', 'B', 'C', 'D'].filter((l) => l !== letra)
  return [letra, ...restantes].map((l, i) => ({
    letter: l,
    text: i === 0 ? s.correta : s.erradas[i - 1],
  }))
}

const BANK = join(ROOT, 'data', 'storage.json')
const bank = JSON.parse(readFileSync(BANK, 'utf8'))
// `replaceItem` faz a troca por texto: reserializar o banco inteiro com
// JSON.stringify reformataria as 180 perguntas ja la e o diff viraria
// 3.800 linhas em vez de ~90. Ver json-append.mjs.
const grounding = JSON.parse(
  readFileSync(join(ROOT, 'data', 'grounding-map.json'), 'utf8'),
)

const urls = new Set()
;(function coletar(o) {
  if (o && typeof o === 'object') {
    if (typeof o.url === 'string') urls.add(o.url)
    for (const v of Object.values(o)) coletar(v)
  }
})(grounding)

const usados = new Set(bank.map((q) => q.subdomain))
const hoje = new Date().toISOString()
const plano = []

for (const s of SUBSTITUICOES) {
  const alvo = bank.find((q) => q.id === s.alvo)
  if (!alvo) throw new Error(`${s.alvo} nao esta em data/storage.json`)
  if (!alvo.question.includes(s.metaconteudo)) {
    throw new Error(
      `${s.alvo}: ja substituido ou question mudou (esperava "${s.metaconteudo}")`,
    )
  }
  if (!urls.has(s.sourceUrl)) {
    throw new Error(
      `${s.alvo}: sourceUrl fora do grounding-map -> ${s.sourceUrl}`,
    )
  }
  if (new Set([s.correta, ...s.erradas]).size !== 4) {
    throw new Error(`${s.alvo}: alternativa repetida`)
  }
  if (usados.has(s.novoSubdomain)) {
    throw new Error(
      `${s.alvo}: subdomain ${s.novoSubdomain} ja em uso no banco`,
    )
  }
  usados.add(s.novoSubdomain)
  plano.push({
    id: s.alvo,
    era: s.era,
    subAntes: alvo.subdomain,
    nova: {
      id: s.alvo,
      domain: 'storage',
      subdomain: s.novoSubdomain,
      type: 'single',
      difficulty: 'medium',
      question: s.pergunta,
      options: opcoesCom(gabaritoDe.get(s.alvo), s),
      correct: [gabaritoDe.get(s.alvo)],
      explanation: s.explicacao,
      source: 'original',
      sourceUrl: s.sourceUrl,
      needsReview: true,
      tags: s.tags,
      createdAt: alvo.createdAt,
      updatedAt: hoje,
      version: 2,
    },
  })
}

console.log('=== PLANO: 8 metacontenos -> conteudo AZ-104 ===\n')
for (const p of plano) {
  console.log(
    `${p.id} (era ${p.era})  sub: ${p.subAntes} -> ${p.nova.subdomain}`,
  )
  console.log(`  url: .../${p.nova.sourceUrl.split('/').pop()}`)
  console.log(`  nova: ${p.nova.question.slice(0, 74)}...`)
  console.log('')
}

if (DRY) {
  console.log('--dry-run: nada escrito')
  process.exit(0)
}

for (const p of plano) {
  const r = replaceItem(BANK, p.id, p.nova)
  console.log(
    `  ${p.id}: ${p.subAntes} -> ${p.nova.subdomain} (${r.bytesAntes} -> ${r.bytesDepois} bytes)`,
  )
}
console.log(
  `\nsubstituidas ${plano.length} em data/storage.json (por texto, sem reformatar)`,
)
