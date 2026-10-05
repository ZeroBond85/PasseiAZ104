#!/usr/bin/env node
/**
 * scaffold-rewrite.mjs — Prepara as 164 para reescrita como MCQ de 4.
 *
 * Por que existe: as 164 sairam em 1d67654 por serem `type: yes-no`
 * (2 alternativas). Nao faltava cobertura, ancoragem nem URL — 42 delas sao
 * mslearn e as 42 ja validam no grounding-map. O trabalho e autorar 2
 * distratores plausiveis por questao.
 *
 * Duas decisoes que este arquivo trava, para nao depender de bom senso na
 * hora de escrever:
 *
 * 1. QUARTAletra. O gate de validate-questions.mts e falha dura: cada letra
 *    precisa ficar em 20-30% das questoes de 4 alternativas com 1 gabarito.
 *    Hoje o banco esta em A 27.3 / B 25.2 / C 26.7 / D 20.8 (572 no total).
 *    Distribuir 164 round-robin deixa D em 21.7% — passa, mas D ja e a letra
 *    mais fraca e herdar a posicao do sim/nao concentraria o vies. Por isso a
 *    letra e sorteada de forma que D receba a cota maior, e o round-robin e
 *    embaralhado para nao ficar A,B,C,D,A,B,C,D (faixa preguicosa seria
 *    detectavel por candidato).
 *
 * 2. NUNCA reordenar para a letraCssim. A opcao correta e posicionada na
 *    letra sorteada, e as demais ocupam as outras tres na ordem original.
 *
 *   node scripts/scaffold-rewrite.mjs            # gera o template
 *   node scripts/scaffold-rewrite.mjs --verify    # confere a alocacao
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, '.agent', 'audits', 'retired-164.json')
const OUT = join(ROOT, '.agent', 'audits', 'retired-164-template.json')

const retired = JSON.parse(readFileSync(SRC, 'utf8'))

/**
 * Cotas por letra. Total 164. We want the FINAL distribution as close to
 * 25% as possible so D stops being the weakest letter.
 *
 * Final counts with these quotas (on top of existing 156/144/153/119):
 *   A 156+27 = 183 / 736 = 24.9%
 *   B 144+40 = 184 / 736 = 25.0%
 *   C 153+32 = 185 / 736 = 25.1%
 *   D 119+65 = 184 / 736 = 25.0%
 */
const QUOTA = { A: 27, B: 40, C: 32, D: 65 }

if (process.argv.includes('--verify')) {
  const t = JSON.parse(readFileSync(OUT, 'utf8'))
  const got = { A: 0, B: 0, C: 0, D: 0 }
  for (const q of t) got[q._correctLetter]++
  const EXIST = { A: 156, B: 144, C: 153, D: 119 }
  let ok = true
  for (const L of ['A', 'B', 'C', 'D']) {
    const total = EXIST[L] + got[L]
    const pct = (total / 736) * 100
    const bad = pct < 20 || pct > 30
    if (bad) ok = false
    console.log(
      `  ${L}: +${String(got[L]).padStart(2)} (cota ${QUOTA[L]}) -> ${total}/736 = ${pct.toFixed(1)}%${bad ? '  <<< REPROVA' : ''}`,
    )
  }
  console.log(ok ? 'gate 20-30%: OK' : 'gate 20-30%: REPROVA')
  process.exit(ok ? 0 : 1)
}

/** Fisher-Yates determinístico (sem Math.random — precisa ser reproduzível). */
function shuffle(arr, seed) {
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// sequencia de letras embaralhada dentro das cotas
const bag = []
for (const [L, n] of Object.entries(QUOTA))
  for (let i = 0; i < n; i++) bag.push(L)
const seq = shuffle(bag, 20261003)
if (seq.length !== retired.length) {
  console.error(`cotas somam ${seq.length}, mas ha ${retired.length} questoes`)
  process.exit(1)
}

// ordem de processamento: por arquivo, para|author por tema
const order = [...retired].sort((a, b) =>
  a.file === b.file ? a.id.localeCompare(b.id) : a.file.localeCompare(b.file),
)

const template = order.map((q, i) => {
  const letter = seq[i]
  const original = q.options ?? []
  const correctText =
    original.find((o) => (q.correct ?? []).includes(o.letter))?.text ??
    original[0]?.text ??
    ''
  const wrongTexts = original
    .filter((o) => !(q.correct ?? []).includes(o.letter))
    .map((o) => o.text)
  const distractors = [...wrongTexts, null, null] // 2 existentes + 2 a autorar
  return {
    id: q.id,
    file: q.file,
    subdomain: q.subdomain,
    source: q.source,
    sourceUrl: q.sourceUrl,
    question: q.question,
    explanation: q.explanation,
    _correctLetter: letter,
    _correctText: correctText,
    _placeholderText: distractors,
    // campos finais, a preencher por batch
    options: null,
    correct: null,
  }
})

mkdirSync(join(ROOT, '.agent', 'audits'), { recursive: true })
writeFileSync(OUT, `${JSON.stringify(template, null, 2)}\n`)

const byFile = {}
for (const t of template) {
  byFile[t.file] ??= []
  byFile[t.file].push(t)
}
console.log(`template: ${template.length} questoes -> ${OUT}\n`)
for (const [f, list] of Object.entries(byFile)) {
  console.log(`  ${String(list.length).padStart(3)}  ${f}`)
}
console.log(`\ncotas: ${JSON.stringify(QUOTA)}`)
console.log(' rode com --verify para conferir o gate 20-30%')
