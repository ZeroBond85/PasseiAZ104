#!/usr/bin/env node
/**
 * apply-rewrite.mjs — Junta os distratores autorados ao template e emite as
 * 164 questoes em formato final de 4 alternativas.
 *
 * Separacao deliberada: o template (scaffold-rewrite.mjs) trava letra e
 * gabarito, e o lote so contem TEXTO de distrator. Assim a parte mecanica
 * nao depende de reescrever a pergunta, e a parte autoral nao pode alterar
 * gabarito sem passar por --verify.
 *
 *   node scripts/apply-rewrite.mjs                 # mostra pendencias
 *   node scripts/apply-rewrite.mjs --emit          # emite final-164.json
 *   node scripts/apply-rewrite.mjs --verify        # reexecuta os gates
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const AUD = join(ROOT, '.agent', 'audits')
const TPL = join(AUD, 'retired-164-template.json')
const BATCH_DIR = join(AUD, 'batches')
const OUT = join(AUD, 'final-164.json')

const template = JSON.parse(readFileSync(TPL, 'utf8'))

// carrega lotes ja autorados
const authored = new Map()
if (existsSync(BATCH_DIR)) {
  for (const f of readdirSync(BATCH_DIR).filter((x) => x.endsWith('.json'))) {
    const b = JSON.parse(readFileSync(join(BATCH_DIR, f), 'utf8'))
    for (const [id, v] of Object.entries(b)) {
      if (authored.has(id)) {
        console.error(`DUPLICADO: ${id} aparece em mais de um lote`)
        process.exit(1)
      }
      authored.set(id, { ...v, _file: f })
    }
  }
}

const LETTERS = ['A', 'B', 'C', 'D']
const missing = []
const problems = []
const done = []

const norm = (s) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

for (const q of template) {
  const a = authored.get(q.id)
  if (!a || !Array.isArray(a.distractors) || a.distractors.length !== 2) {
    missing.push(q.id)
    continue
  }
  const [d1, d2] = a.distractors
  for (const [i, d] of [d1, d2].entries()) {
    if (typeof d !== 'string' || d.trim().length < 15) {
      problems.push(`${q.id}: distrator ${i + 1} curto demais`)
    }
  }

  const others = q._placeholderText.filter((x) => x !== null)
  const correct = q._correctText
  if (!correct) problems.push(`${q.id}: gabarito vazio`)

  // gabarito na letra designada; as outras tres na ordem original
  const wrongPool = [...others, d1, d2]
  const options = []
  let wi = 0
  for (const L of LETTERS) {
    if (L === q._correctLetter) options.push({ letter: L, text: correct })
    else options.push({ letter: L, text: wrongPool[wi++] })
  }
  if (wi !== 3) problems.push(`${q.id}: sobrou/ faltou distrator`)

  // alternativas duplicadas ou iguais a um trecho do enunciado
  const seen = new Set()
  for (const o of options) {
    const k = norm(o.text)
    if (seen.has(k))
      problems.push(`${q.id}: alternativa duplicada (${o.letter})`)
    seen.add(k)
  }
  const stem = norm(q.question)
  for (const o of options) {
    if (o.letter === q._correctLetter) continue
    const t = norm(o.text)
    if (t && stem.includes(t))
      problems.push(`${q.id}: distrator ${o.letter} repete o enunciado`)
  }
  // explicacao nao pode citar a letra do gabarito
  if (
    new RegExp(`letra\\s+${q._correctLetter}\\b`, 'i').test(q.explanation ?? '')
  ) {
    problems.push(`${q.id}: explicacao cita a letra do gabarito`)
  }

  // Texto corrompido. Os gates acima so olham estrutura e comprimento, e dois
  // distratores entraram com lixo no meio ("minutosRoyston", "points de
  // Instance") passando no comprimento minimo. Esta lista pega o padrao.
  // Um distrator autoral nao deve conter identificador de codigo — `sourceAnchor`,
  // `Microsoft.Resources`. Ja o enunciado original e a explicacao trazem, e sao
  // preservados: o check so roda sobre as 3 alternativas ERRADAS.
  // Texto corrompido por geracao. O padrao real observado foi CAMELCASE-INLINE
  // em PT-BR ("minutosRoyston") e ponto no meio da frase ("de.orquestracao").
  // Nenhum dos dois e PT-BR legitimo. Identificadores tecnicos de verdade
  // ("Microsoft.Resources", "sourceAnchor") sao preservados de proposito: o
  // portal do Azure usa esses termos, e a pergunta original ja os trazia.
  const _RX_CAMEL = 0
  const _RX_DOT = 1
  const RX_CHARS = 2
  const _RX_DUP = 3
  const SUSPECT = [
    /\b[a-zà-ú]+[A-Z][a-zà-ú]+\b/, // camelCase inline: "minutosRoyston"
    /\b[a-zà-ú]{2,}\.[a-zà-ú]{2,}\b/i, // ponto no meio: "de.orquestracao" (excecoes abaixo)
    /[<>{}|\\^`]/,
    /\b(\w{4,})\s+\1\b/i, // duplicacaoimmediate: exige 4+ letras, senao
    // PT-BR legitimo ("do do diretório", "a a") dispara a cada frase
    /[\u4e00-\u9fff\u3040-\u30ff]/, // CJK/kana: nunca aparece em PT-BR
    /\s+$|^\s+/,
  ]
  // Identificadores tecnicos legitimos que os padroes acima acusariam por
  // engano. Sao termos que o portal do Azure usa de verdade, e a alternativa
  // ORIGINAL da pergunta ja os trazia: o check precisa isentar o historico,
  // senao obriga o autor a censurar documentacao real.
  const DOT_OK = /\bMicrosoft\.[A-Za-z]+\b/g
  const CAMEL_OK = /\bsourceAnchor\b|\bsoftMatch\b|\bhardMatch\b|\bUPN\b/g

  // Origem de cada alternativa: as 3 ERRADAS sao [original sim/nao + 2
  // autoradas]. O texto historico e saint e nao pode ser reescrito — o
  // gabarito errado "Nao, WIP >50" e conteudo tecnico legitimo. Por isso o
  // check de pontuação (`<`, `>`, `|`) so se aplica ao que o autor escreveu.
  const authoredTexts = new Set([d1, d2])

  // Um mesmo par (texto, letra) pode ter vindo do historico OU da minha autoria,
  // entao a distincao e por conteudo: se o texto existe entre os 2 distratores
  // autorados, ele NAO pode serpie historic.
  for (const o of options) {
    const isAuthored = authoredTexts.has(o.text)
    const masked = o.text
      .replace(DOT_OK, 'MicrosoftResources')
      .replace(CAMEL_OK, 'identificador')
    for (let i = 0; i < SUSPECT.length; i++) {
      const rx = SUSPECT[i]
      // `>`, `<`, `|` sao sintaxe legitima em texto tecnico herdado
      // ("WIP >50"). So reprova no que o AUTOR escreveu.
      if (i === RX_CHARS && !isAuthored) continue
      if (rx.test(masked)) {
        problems.push(
          `${q.id}: alternativa ${o.letter} com texto corrompido (rx#${i})${isAuthored ? '' : ' [historico]'} → "${o.text.slice(0, 70)}"`,
        )
        break
      }
    }
  }

  // `domain` nao pode ser derivado so do prefixo do arquivo: os tres arquivos
  // de compute (vms/apps/platform) sao domain "compute", e os dois de
  // identidade sao domain "identidade-governanca". Estava ausente e o Zod
  // (domain obrigatorio + enum) derrubava as 164.
  const DOMAIN_BY_FILE = {
    'identidade-governanca.json': 'identidade-governanca',
    'identidade-acesso.json': 'identidade-governanca',
    'storage.json': 'storage',
    'rede-virtual.json': 'rede-virtual',
    'monitoramento.json': 'monitoramento',
    'compute-vms.json': 'compute',
    'compute-apps.json': 'compute',
    'compute-platform.json': 'compute',
  }
  done.push({
    id: q.id,
    domain: DOMAIN_BY_FILE[q.file],
    subdomain: q.subdomain,
    source: q.source,
    ...(q.sourceUrl ? { sourceUrl: q.sourceUrl } : {}),
    // 'single' e o termo do schema; 'multiple-choice' e multipla resposta e
    // o validator conta isso como geracao indevida.
    type: 'single',
    difficulty: q.difficulty ?? 'medium',
    question: q.question,
    options,
    correct: [q._correctLetter],
    explanation: q.explanation,
    needsReview: false,
    tags: q.tags ?? ['g16'],
    _file: q.file,
  })
}

console.log(`template : ${template.length}`)
console.log(`autoradas: ${done.length}`)
console.log(`pendentes: ${missing.length}`)

if (problems.length) {
  console.log(`\n=== PROBLEMAS (${problems.length}) ===`)
  for (const p of problems) console.log(`  ! ${p}`)
}

if (missing.length) {
  const byFile = {}
  for (const id of missing) {
    const t = template.find((x) => x.id === id)
    byFile[t.file] ??= []
    byFile[t.file].push(id)
  }
  console.log('\n=== PENDENTES POR ARQUIVO ===')
  for (const [f, ids] of Object.entries(byFile))
    console.log(`  ${String(ids.length).padStart(3)}  ${f}`)
  console.log(
    '\n  ' +
      missing.slice(0, 20).join(', ') +
      (missing.length > 20 ? ' …' : ''),
  )
}

if (process.argv.includes('--verify')) {
  const got = { A: 0, B: 0, C: 0, D: 0 }
  for (const q of done) got[q.correct[0]]++
  const EXIST = { A: 156, B: 144, C: 153, D: 119 }
  let ok = problems.length === 0
  console.log('\n=== GATE gabarito 20-30% ===')
  for (const L of LETTERS) {
    const total = EXIST[L] + got[L]
    const denom = 572 + done.length
    const pct = (total / denom) * 100
    const bad = pct < 20 || pct > 30
    if (bad) ok = false
    console.log(
      `  ${L}: +${String(got[L]).padStart(2)} -> ${total}/${denom} = ${pct.toFixed(1)}%${bad ? '  <<< REPROVA' : ''}`,
    )
  }
  // pares nao podem aumentar
  console.log(
    `\n  multiplas escolhas geradas: ${done.filter((q) => q.correct.length > 1).length} (esperado 0)`,
  )
  if (done.some((q) => q.correct.length > 1)) ok = false
  console.log(ok ? '\nGATE: OK' : '\nGATE: REPROVA')
  process.exit(ok ? 0 : 1)
}

if (process.argv.includes('--emit')) {
  if (missing.length) {
    console.error('\n--emit abortado: ainda ha pendentes')
    process.exit(1)
  }
  if (problems.length) {
    console.error('\n--emit abortado: ha problemas')
    process.exit(1)
  }
  writeFileSync(OUT, `${JSON.stringify(done, null, 2)}\n`)
  console.log(`\nemitted: ${done.length} -> ${OUT}`)
}
