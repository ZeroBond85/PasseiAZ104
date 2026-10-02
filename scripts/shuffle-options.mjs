#!/usr/bin/env node
/**
 * Baralha as alternativas de forma deterministica (semente = hash do id) e
 * reescreve letras + campo `correct`, sem tocar no conteudo das questoes.
 *
 * Motivo: o banco foi escrito sempre com gabarito em A (657 de 730 questoes
 * de resposta unica) e sempre com o par "AB" nas de multiplura escolha, o que
 * torna o simulador adivinhavel e invalida a avaliacao de dominio.
 *
 * Idempotente: a semente vem do id, entao rodar duas vezes da o mesmo
 * resultado. `--check` so relata a distribuicao, `--write` aplica.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DATA = join(ROOT, 'data')
const FILES = [
  'storage.json',
  'compute-vms.json',
  'compute-apps.json',
  'compute-platform.json',
  'rede-virtual.json',
  'monitoramento.json',
  'identidade-governanca.json',
  'identidade-acesso.json',
]
const LETTERS = ['A', 'B', 'C', 'D', 'E']

const mode = new Set(process.argv.slice(2)).has('--write') ? 'write' : 'check'

/** Fluxo pseudoaleatorio deterministico e sem correlacao com o seed. */
function prngFor(id) {
  let counter = 0
  return () => {
    counter += 1
    const h = createHash('sha256').update(id).update(`#${counter}`).digest()
    return h.readUInt32BE(0) / 0x1_0000_0000
  }
}

function shuffle(list, rand) {
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

const single = new Map()
const multi = new Map()
const byCount = new Map()
let touched = 0

for (const file of FILES) {
  const path = join(DATA, file)
  const questions = JSON.parse(readFileSync(path, 'utf8'))
  let changed = 0

  for (const q of questions) {
    if (!Array.isArray(q.options) || q.options.length < 2) continue

    const correctTexts = q.correct
      .map((letter) => q.options.find((o) => o.letter === letter)?.text)
      .filter((t) => t !== undefined)
    if (correctTexts.length === 0) {
      throw new Error(`${q.id}: gabarito aponta para alternativa inexistente`)
    }

    // Canonicaliza por texto ANTES de embaralhar: sem isso o Fisher-Yates
    // permuta a ordem corrente e rodar duas vezes dá resultados diferentes.
    const canonical = q.options
      .slice()
      .sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
    const shuffled = shuffle(canonical, prngFor(q.id))
    const nextOptions = shuffled.map((o, i) =>
      Object.assign({}, o, { letter: LETTERS[i] }),
    )
    const nextCorrect = correctTexts.map(
      (t) => nextOptions.find((o) => o.text === t).letter,
    )

    if (
      JSON.stringify([q.options, q.correct]) !==
      JSON.stringify([nextOptions, nextCorrect])
    ) {
      q.options = nextOptions
      q.correct = nextCorrect
      changed += 1
      touched += 1
    }

    if (q.correct.length === 1) {
      single.set(q.correct[0], (single.get(q.correct[0]) ?? 0) + 1)
      const key = `${q.options.length} opcoes`
      if (!byCount.has(key)) byCount.set(key, new Map())
      const inner = byCount.get(key)
      inner.set(q.correct[0], (inner.get(q.correct[0]) ?? 0) + 1)
    } else {
      const key = q.correct.slice().sort().join('')
      multi.set(key, (multi.get(key) ?? 0) + 1)
    }
  }

  if (mode === 'write' && changed > 0) {
    writeFileSync(path, `${JSON.stringify(questions, null, 2)}\n`)
  }
  console.log(
    `${mode === 'write' ? 'escrito   ' : 'verificado'}: ${file} (${changed} reordenadas)`,
  )
}

function report(label, map) {
  const entries = [...map.entries()].sort()
  const total = entries.reduce((s, e) => s + e[1], 0)
  if (total === 0) return
  console.log('')
  console.log(`${label} (total ${total}):`)
  for (const [key, n] of entries) {
    console.log(`  ${key}: ${n} (${((n / total) * 100).toFixed(1)}%)`)
  }
}

report('gabarito de resposta unica', single)
report('par de multiplura escolha', multi)
for (const [key, map] of [...byCount.entries()].sort()) {
  report(`resposta unica com ${key}`, map)
}
console.log('')
console.log(
  mode === 'write'
    ? `${touched} questoes reordenadas; rode o formatter e o gate.`
    : 'Somente leitura; use --write para aplicar.',
)
