#!/usr/bin/env node
/**
 * apply-outline-lotes.mjs — substitui as questions `sla-*` por conteudo do
 * outline oficial do AZ-104.
 *
 * Por que: SLA nao existe no outline. Verifiquei os 82 bullets do study guide
 * oficial (skills measured as of April 17, 2026) e nenhum menciona SLA, service
 * level agreement ou credito — e assunto do AZ-900. As 53 `sla-*` de
 * data/rede-virtual.json ocupavam 29% do banco de rede, e 3 entradas artificiais
 * (`rv-vnets#6`, `rv-secure-access#6`, `rv-dns-lb#4`) estavam no grounding-map
 * so para dar cobertura a elas.
 *
 * Os lotes em .agent/audits/batches/ sao escritos a partir de fatos extraidos das
 * docs oficiais (ver *.md de fatos ao lado), nunca de memoria: no primeiro bloco,
 * 5 de 11 questoes escritas de memoria estavam factualmente erradas.
 *
 *   node scripts/apply-outline-lotes.mjs --dry-run   # so o plano
 *   node scripts/apply-outline-lotes.mjs             # aplica
 *   node scripts/apply-outline-lotes.mjs --lote rede-outline-lb
 *
 * Idempotente: aborta se algum alvo ja tiver sidomain != o do lote, para nao
 * reaplicar em cima de si mesmo. `--force` ignora a trava.
 *
 * Preserva o gabarito de cada ID: `gabarito` do lote diz em que letra a correta
 * deve cair, e o script monta as opcoes nessa ordem. O gabarito do banco vira a
 * letra no lote por construcao (checado no --dry-run), entao a distribuicao
 * global A/B/C/D nao muda.
 *
 * needsReview:true em todas, porque sao escritas por mim e nao extraidas de
 * fonte: a confirmacao semantica final fica humana.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { replaceItem } from './json-append.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DRY = process.argv.includes('--dry-run')
const FORCE = process.argv.includes('--force')
const ARG_LOTE = process.argv.indexOf('--lote')
const SO_LOTE = ARG_LOTE !== -1 ? process.argv[ARG_LOTE + 1] : null

/**
 * Proveniencia por questao: cada item do lote declara o doc que leu. Nao aceito
 * uma URL por lote porque ela escondia que, no bloco LB, questoes sobre floating
 * IP, HA ports e sondas vinham de docs diferentes do overview. `scripts/check-lote.mjs`
 * expoe o item sem sourceUrl.
 */
const BATCHES = ['rede-outline-lb', 'rede-outline-nsg', 'rede-outline-udr']
const LETRAS = ['A', 'B', 'C', 'D']
const BANCO = 'rede-virtual'
const BANK = join(ROOT, 'data', `${BANCO}.json`)

/** As URLs que o validador aceita: url + extraUrls de cada bullet. */
function urlsDoGroundingMap() {
  const gm = JSON.parse(
    readFileSync(join(ROOT, 'data', 'grounding-map.json'), 'utf8'),
  )
  const urls = new Set()
  for (const b of Object.values(gm.bullets ?? {})) {
    if (typeof b.url === 'string' && b.url) urls.add(b.url)
    for (const u of b.extraUrls ?? []) urls.add(u)
  }
  return urls
}

const bank = JSON.parse(readFileSync(BANK, 'utf8'))
const grounding = urlsDoGroundingMap()
const usados = new Set(bank.map((q) => q.subdomain))
const lotes = SO_LOTE ? [SO_LOTE] : BATCHES
const hoje = new Date().toISOString()
const plano = []

for (const nome of lotes) {
  const caminho = join(ROOT, '.agent', 'audits', 'batches', `${nome}.json`)
  const itens = JSON.parse(readFileSync(caminho, 'utf8')).itens

  for (const item of itens) {
    const sourceUrl = item.sourceUrl
    if (!sourceUrl) {
      throw new Error(
        `${item.alvo}: sem sourceUrl no lote — a proveniencia tem de ser por ` +
          `questao, nao por lote (rode scripts/check-lote.mjs ${nome})`,
      )
    }
    if (!grounding.has(sourceUrl)) {
      throw new Error(
        `${item.alvo}: sourceUrl fora do grounding-map -> ${sourceUrl}\n` +
          `    Adicione a URL como extraUrls do bullet correspondente antes de aplicar.`,
      )
    }

    const alvo = bank.find((q) => q.id === item.alvo)
    if (!alvo) throw new Error(`${item.alvo}: nao esta em data/${BANCO}.json`)

    // O lote pode corrigir um item ja aplicado — foi assim que as 5 respostas
    // erradas do bloco NSG entraram no banco. Exige --force para nao acontecer
    // por acidente, porque nesse caso o subdomínio do banco ja e o do lote.
    const jaAplicado = alvo.subdomain === item.subdomain
    if (jaAplicado && !FORCE) {
      throw new Error(
        `${item.alvo}: ja esta como ${item.subdomain} — lote ja aplicado?\n` +
          `    Use --force para corrigir de proposito um item ja aplicado.`,
      )
    }
    // so as sla-* sao alvos: se o ID nao for mais de SLA, algo mudou
    if (!jaAplicado && !alvo.subdomain.startsWith('sla-')) {
      throw new Error(
        `${item.alvo}: subdomínio "${alvo.subdomain}" nao começa com sla- — ` +
          `este lote so substitui conteudo de SLA`,
      )
    }
    if (usados.has(item.subdomain) && !jaAplicado) {
      throw new Error(`${item.alvo}: subdomain ${item.subdomain} ja em uso`)
    }
    usados.add(item.subdomain)

    // gabarito do lote tem de bater com o gabarito que ja esta no banco, senao
    // a distribuicao global de letras muda quando a substituicao for aplicada
    if (alvo.correct[0] !== item.gabarito) {
      throw new Error(
        `${item.alvo}: gabarito do lote (${item.gabarito}) != banco (${alvo.correct[0]})`,
      )
    }

    const opcoes = new Set([item.correta, ...item.erradas])
    if (opcoes.size !== 4) {
      throw new Error(`${item.alvo}: alternativa repetida (${opcoes.size}/4)`)
    }
    // monta placing a correta na letra do gabarito
    const _restantes = LETRAS.filter((l) => l !== item.gabarito)
    const opcoesFinal = []
    let k = 0
    for (const letra of LETRAS) {
      opcoesFinal.push({
        letter: letra,
        text: letra === item.gabarito ? item.correta : item.erradas[k++],
      })
    }

    plano.push({
      lote: nome,
      id: item.alvo,
      subAntes: alvo.subdomain,
      nova: {
        id: alvo.id,
        domain: BANCO,
        subdomain: item.subdomain,
        type: 'single',
        difficulty: alvo.difficulty,
        question: item.pergunta,
        options: opcoesFinal,
        correct: [item.gabarito],
        explanation: item.explicacao,
        source: 'original',
        sourceUrl,
        needsReview: true,
        tags: item.tags,
        createdAt: alvo.createdAt,
        updatedAt: hoje,
        version: (alvo.version ?? 1) + 1,
      },
    })
  }
}

console.log(
  `=== PLANO: ${plano.length} questoes sla-* -> conteudo do outline ===\n`,
)
for (const nome of lotes) {
  const doLote = plano.filter((p) => p.lote === nome)
  const docs = [...new Set(doLote.map((p) => p.nova.sourceUrl))]
  console.log(
    `${nome}  (${doLote.length})  ->  ${docs.length} doc(s) de origem`,
  )
  for (const d of docs) console.log(`    ${d}`)
  for (const p of doLote) {
    console.log(
      `  ${p.id}  ${p.subAntes} -> ${p.nova.subdomain}   gab ${p.nova.correct[0]}`,
    )
  }
  console.log('')
}

const gabaritos = plano.reduce((acc, p) => {
  acc[p.nova.correct[0]] = (acc[p.nova.correct[0]] ?? 0) + 1
  return acc
}, {})
console.log('letras preservadas:', JSON.stringify(gabaritos))

if (DRY) {
  console.log('\n--dry-run: nada escrito')
  process.exit(0)
}

for (const p of plano) {
  const r = replaceItem(BANK, p.id, p.nova)
  console.log(
    `  ${p.id}: ${p.subAntes} -> ${p.nova.subdomain} (${r.bytesAntes} -> ${r.bytesDepois} bytes)`,
  )
}
console.log(`\nsubstituidas ${plano.length} em data/${BANCO}.json`)
