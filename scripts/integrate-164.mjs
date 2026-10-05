#!/usr/bin/env node
/**
 * integrate-164.mjs — Integra as 164 reescritas nos arquivos de dominio.
 *
 * Escrita em 3 passos para nao perder trabalho se algo falhar no meio:
 *   1. snapshot dos arquivos originais em .agent/audits/pre-integrate/
 *   2. reescrita原子 (lê tudo, valida, escreve)
 *   3. roda o proprio validate-questions; nao rollback automatico, porque
 *      sobrescrever o banco errado e pior que um banco inconsistente
 *      visivel. O snapshot existe para o rollback ser manual e rapido.
 *
 *   node scripts/integrate-164.mjs            # aplica
 *   node scripts/integrate-164.mjs --dry-run  # so o plano
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appendJson } from './json-append.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const FINAL = join(ROOT, '.agent', 'audits', 'final-164.json')
const SNAP = join(ROOT, '.agent', 'audits', 'pre-integrate')
const DRY = process.argv.includes('--dry-run')

const final = JSON.parse(readFileSync(FINAL, 'utf8'))
const retireIds = new Set(
  JSON.parse(
    readFileSync(join(ROOT, 'data', 'retire_autoeval_ids.json'), 'utf8'),
  ),
)

/**
 * IDs NOVOS, e `retire_autoeval_ids.json` fica intacto como registro historico.
 *
 * Decisao do usuario. Repor os IDs originais (az104-st-049...) resolveria a
 * questao do filtro --exatamente por isso o filtro os bloqueava--, mas
 * apagaria a distincao entre "pergunta reformulada" e "pergunta nova", e
 * tornaria a lista de aposentadoria um documento que mente sobre o estado atual
 * (ids que ela diz estar aposentados estariam no banco).
 *
 * O schema Zod exige `^az104-(ig|st|co|rv|mo)-\d{3}$`, entao nao ha como
 * marcar a origem no proprio ID: a rastreabilidade fica no mapa
 * `g16-id-map.json` gravado por este script.
 *
 * A numeracao continua a sequencia ja usada no banco (max+1 por prefixo), e
 * nao reinicia em 001 --reiniciar colidiria com as centenas de ids existentes.
 */
const DOMAIN_PREFIX = {
  'identidade-governanca.json': 'ig',
  'identidade-acesso.json': 'ig',
  'storage.json': 'st',
  'rede-virtual.json': 'rv',
  'monitoramento.json': 'mo',
  'compute-vms.json': 'co',
  'compute-apps.json': 'co',
  'compute-platform.json': 'co',
}
const ID_RE = /^az104-(ig|st|co|rv|mo)-(\d{3})$/

/** maior numero ja usado por prefixo, lido do banco atual */
function maxSeqPerPrefix() {
  const banks = [...new Set(final.map((q) => q._file))]
  const mx = new Map()
  for (const file of banks) {
    const arr = JSON.parse(readFileSync(join(ROOT, 'data', file), 'utf8'))
    for (const q of arr) {
      const m = ID_RE.exec(q.id)
      if (!m) continue
      mx.set(m[1], Math.max(mx.get(m[1]) ?? 0, Number(m[2])))
    }
  }
  return mx
}

const seq = maxSeqPerPrefix()
const idMap = []

function g16Id(file, oldId) {
  const pre = DOMAIN_PREFIX[file]
  if (!pre) throw new Error(`${file}: sem prefixo de dominio`)
  const n = (seq.get(pre) ?? 0) + 1
  if (n > 999) throw new Error(`prefixo ${pre} estourou 3 digitos`)
  seq.set(pre, n)
  const novo = `az104-${pre}-${String(n).padStart(3, '0')}`
  idMap.push({ novo, antigo: oldId, de: file })
  return novo
}

// agrupa por arquivo de destino (campo _file veio do historico)
const byFile = new Map()
for (const q of final) {
  if (!q._file) throw new Error(`${q.id}: sem _file`)
  if (!byFile.has(q._file)) byFile.set(q._file, [])
  byFile.get(q._file).push(q)
}
// ordena por id antigo para que a sequencia g16 seja determinstica
for (const list of byFile.values())
  list.sort((a, b) => a.id.localeCompare(b.id))
for (const list of byFile.values())
  for (const q of list) q.id = g16Id(q._file, q.id)

/**
 * Guarda de idempotencia. Este script faz append, entao rodar duas vezes
 * duplica as 164 — e so o validate acusa isso, longe da causa. Checar o total
 * dos bancos antes de escrever: 836 = pre-integracao, 1000 = pos-integracao.
 */
const ESPERADO_ANTES = 836
const ESPERADO_DEPOIS = 1000
let somaAtual = 0
for (const file of byFile.keys()) {
  somaAtual += JSON.parse(readFileSync(join(ROOT, 'data', file), 'utf8')).length
}
if (somaAtual === ESPERADO_DEPOIS && !process.argv.includes('--force')) {
  console.error(
    `ABORTADO: os bancos ja somam ${ESPERADO_DEPOIS}. As 164 ja foram integradas; ` +
      'use --force se quiser duplicar de proposito.',
  )
  process.exit(1)
}
if (somaAtual !== ESPERADO_ANTES && somaAtual !== ESPERADO_DEPOIS) {
  console.error(
    `ABORTADO: os bancos somam ${somaAtual} questoes. Esperado ${ESPERADO_ANTES} ` +
      `(pre-integracao) ou ${ESPERADO_DEPOIS} (pos-integracao). O estado e inesperado — ` +
      'restaure data/ do git e rode de novo.',
  )
  process.exit(1)
}

console.log('=== PLANO DE INTEGRACAO ===\n')
let totalAdded = 0
const newIds = []
for (const [file, list] of [...byFile].sort()) {
  const p = join(ROOT, 'data', file)
  const arr = JSON.parse(readFileSync(p, 'utf8'))
  const existing = new Set(arr.map((q) => q.id))
  const dup = list.filter((q) => existing.has(q.id))
  // nenhum ID novo pode colidir com a lista de aposentadoria: os az104-*-g16-*
  // tem prefixo distinto, mas o check continua porque e o unico lugar onde
  // um erro de nomenclatura apareceria como bug silencioso.
  const collidesWithRetire = list.filter((q) => retireIds.has(q.id))
  const clean = list.filter((q) => !existing.has(q.id) && !retireIds.has(q.id))
  // o schema Zod rejeita qualquer id fora de ^az104-(ig|st|co|rv|mo)-\d{3}$,
  // e o erro so apareceria no validate, longe da causa. Checar aqui.
  const badId = clean.filter((q) => !ID_RE.test(q.id))
  if (badId.length) {
    console.error(`ABORTADO: ${badId.length} id(s) fora do schema em ${file}:`)
    for (const q of badId.slice(0, 5)) console.error(`  ${q.id}`)
    process.exit(1)
  }
  for (const q of clean) newIds.push(q.id)
  totalAdded += clean.length
  console.log(`data/${file}`)
  console.log(
    `  atual ${String(arr.length).padStart(3)} + ${String(clean.length).padStart(3)} = ${arr.length + clean.length}`,
  )
  console.log(
    `  colisao de ID: ${dup.length + collidesWithRetire.length} (esperado 0)`,
  )
  console.log(
    `  faixa: ${clean[0]?.id ?? '-'} .. ${clean[clean.length - 1]?.id ?? '-'}`,
  )
  if (dup.length || collidesWithRetire.length) {
    console.log(
      `    PROBLEMA: ${[...dup, ...collidesWithRetire].map((q) => q.id).join(', ')}`,
    )
  }
  console.log('')
}
const idUniq = new Set(newIds)
if (idUniq.size !== newIds.length) {
  console.error(
    `ABORTADO: ${newIds.length - idUniq.size} IDs duplicados entre arquivos`,
  )
  process.exit(1)
}
if (retireIds.size !== 164) {
  console.error(
    `ABORTADO: retire_autoeval_ids tem ${retireIds.size}, esperado 164 (historico imutavel)`,
  )
  process.exit(1)
}
console.log(`total a adicionar: ${totalAdded}`)
console.log(`banco resultante: ${836 + totalAdded}`)

if (DRY) {
  console.log('\n--dry-run: nada escrito')
  process.exit(0)
}

// passo 1: snapshot
mkdirSync(SNAP, { recursive: true })
for (const file of byFile.keys()) {
  copyFileSync(join(ROOT, 'data', file), join(SNAP, file))
}
console.log(
  `\nsnapshot: ${byFile.size} arquivos em .agent/audits/pre-integrate/`,
)

// passo 2: escrita (insercao textual -- ver json-append.mjs)
for (const [file, list] of byFile) {
  const p = join(ROOT, 'data', file)
  const existing = new Set(JSON.parse(readFileSync(p, 'utf8')).map((q) => q.id))
  const clean = list.filter((q) => !existing.has(q.id) && !retireIds.has(q.id))
  // ordem das chaves: mesma do QuestionSchema e do resto do banco, com
  // createdAt/updatedAt/version no fim como o gerador original gravava
  const payload = clean.map(({ _file, ...rest }) => {
    // a questao reescrita nao tem timestamps porque veio do historico, que
    // nao os gravava; o schema exige os dois
    const hoje = new Date().toISOString()
    return {
      id: rest.id,
      domain: rest.domain,
      subdomain: rest.subdomain,
      type: rest.type,
      difficulty: rest.difficulty,
      question: rest.question,
      options: rest.options,
      correct: rest.correct,
      explanation: rest.explanation,
      source: rest.source,
      ...(rest.sourceUrl ? { sourceUrl: rest.sourceUrl } : {}),
      needsReview: rest.needsReview,
      tags: rest.tags,
      createdAt: hoje,
      updatedAt: hoje,
      version: 1,
    }
  })
  const r = appendJson(p, payload)
  console.log(
    `  data/${file}: +${r.added} (+${r.bytesDepois - r.bytesAntes} bytes)`,
  )
}

// passo 3: mapa de rastreabilidade (o ID nao carrega a origem por causa do schema)
const MAP = join(ROOT, '.agent', 'audits', 'g16-id-map.json')
writeFileSync(MAP, `${JSON.stringify(idMap, null, 2)}\n`)
console.log(
  `\nmapa antigo -> novo: .agent/audits/g16-id-map.json (${idMap.length} entradas)`,
)
console.log('integrado. rode: npm run validate')
console.log('rollback manual: copie de .agent/audits/pre-integrate/ para data/')
