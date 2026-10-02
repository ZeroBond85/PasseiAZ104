#!/usr/bin/env node
/**
 * remap-explanation-letters.mjs — alinha as letras citadas na `explanation`
 * ("A está correta: ...") com a alternativa que aquele trecho realmente
 * descreve.
 *
 * Contexto: `shuffle-options.mjs` reatribui as letras de `options`, mas nunca
 * tocou nos corpos da `explanation`. O resultado é texto whose bodies stayed
 * put while the letters went stale, então a letra citada deixa de corresponder
 * à alternativa que o corpo justifica.
 *
 * Algoritmo (sem dependência de posição nem de estado anterior):
 *   1. cada trecho da explicação vira um slot, com o texto do corpo e o
 *      veredicto declarado ("correta" / "incorreta");
 *   2. o veredicto é restrição dura: slots "correta" só podem receber letras do
 *      gabarito, slots "incorreta" só letras de fora dele;
 *   3. dentro de cada pool, a bijeção que maximiza a similaridade de texto
 *      (Dice sobre prefixos de token, insensível a acentuação e a flexão
 *      simples como dinâmica/dinâmico) vence as demais;
 *   4. se qualquer slot ficar abaixo de SIM_FLOOR, a questão NÃO é gravada: ela
 *      vai para revisão manual. Silenciar divergência semeada é pior do que
 *      deixar pendente.
 *
 *   node scripts/remap-explanation-letters.mjs          # só mostra o plano
 *   node scripts/remap-explanation-letters.mjs --write  # aplica
 */
import { readFileSync, writeFileSync } from 'node:fs'

const DATA = 'data'
const FILES = [
  'compute-platform.json',
  'identidade-governanca.json',
  'monitoramento.json',
  'rede-virtual.json',
  'storage.json',
]

/** Menções de letra que fazem parte de uma alegação ("A", "A e B", "A, B e C"). */
const CLAIM =
  /([A-E](?:\s*(?:,|e)\s*[A-E])*)\s+est[áaã]o?\s+(corretas?|incorretas?)/gi

const STOP = new Set([
  'a',
  'o',
  'as',
  'os',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'por',
  'para',
  'com',
  'um',
  'uma',
  'e',
  'ou',
  'que',
  'se',
  'ao',
  'aos',
  'sao',
  'the',
  'of',
  'to',
  'ser',
  'esta',
  'este',
  'isso',
  'isto',
  'sim',
  'nao',
])

/** Prefixo usado como identidade de token: casa flexão simples em pt-BR. */
const PREFIX = 5
/** Abaixo disso o corpo não é reconhecível como falar daquela alternativa. */
const SIM_FLOOR = 0.1
/**
 * Folga mínima entre o melhor e o segundo melhor casamento dentro do mesmo
 * grupo de veredicto. Abaixo disso o texto é ambíguo: paráfrase ("captura
 * integral" ↔ "packet capture") dá empate, e reescrever por empate troca a
 * ordem de letras sem provar que estava errada. Em ambiguidade, humano decide.
 */
const MARGIN_FLOOR = 0.15

function tokens(s) {
  return new Set(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      // Número é conteúdo, mesmo com 1 ou 2 dígitos: em opções que só diferem
      // pelo valor ("7 dias" / "30 dias" / "90 dias"), o número é o ÚNICO
      // vocabulário que distingue as alternativas. Sem esta exceção as três
      // tokenizam para {dias}, a bijeção vira empate e a revisão fica
      // impossível de fechar sem reescrever o enunciado bom.
      .filter((t) => (/^\d+$/.test(t) || t.length > 2) && !STOP.has(t))
      .map((t) => t.slice(0, PREFIX)),
  )
}

function dice(a, b) {
  if (!a?.size || !b?.size) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  return (2 * inter) / (a.size + b.size)
}

function permutations(arr) {
  if (arr.length === 0) return [[]]
  const out = []
  for (let i = 0; i < arr.length; i += 1) {
    for (const rest of permutations(arr.slice(0, i).concat(arr.slice(i + 1)))) {
      out.push([arr[i], ...rest])
    }
  }
  return out
}

/** Segmenta a explicação em alegações, ignorando as letras citadas. */
function extractClaims(explanation) {
  const marks = []
  CLAIM.lastIndex = 0
  let m = CLAIM.exec(explanation)
  while (m) {
    marks.push({
      start: m.index,
      headEnd: m.index + m[0].length,
      letters: m[1]
        .split(/\s*(?:,|e)\s*/i)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean),
      verdict: m[2].toLowerCase().startsWith('corret')
        ? 'correta'
        : 'incorreta',
    })
    m = CLAIM.exec(explanation)
  }
  if (marks.length === 0) return null
  return marks.map((mk, i) => ({
    start: mk.start,
    headEnd: mk.headEnd,
    letters: mk.letters,
    verdict: mk.verdict,
    // o corpo de cada alegação vai até a próxima alegação
    text: explanation
      .slice(
        mk.headEnd,
        i + 1 < marks.length ? marks[i + 1].start : explanation.length,
      )
      .replace(/^[\s:;,]+/, '')
      .trim(),
  }))
}

/**
 * Expande as alegações em slots — um por letra citada.
 * Um grupo ("C e D estão incorretas") com k partes separadas por ";" ganha um
 * slot por parte; se o corpo for indivisível, todos os slots do grupo recebem o
 * mesmo texto, o que ainda é válido: a razão é a mesma para todas.
 */
function toSlots(claims) {
  const slots = []
  for (const c of claims) {
    if (c.letters.length === 1) {
      slots.push({ text: c.text, verdict: c.verdict })
      continue
    }
    const parts = c.text.split(/\s*;\s*/).filter(Boolean)
    if (parts.length === c.letters.length) {
      c.letters.forEach((_, i) => {
        slots.push({ text: parts[i], verdict: c.verdict })
      })
    } else {
      c.letters.forEach(() => {
        slots.push({ text: c.text, verdict: c.verdict })
      })
    }
  }
  return slots
}

/**
 * Melhor bijeção de um pool de slots para um pool de letras alvo.
 * Retorna `{ p, margin }`, onde `margin` é a folga para a segunda melhor
 * bijeção. Corpo compartilhado ("C e A estão corretas: <mesma razão>") dá dois
 * slots com texto idêntico, logo as duas bijeções empatam e a ordem de
 * enumeração decide quem fica com C — puro acaso. `margin` baixo sinaliza isso
 * para revisão humana em vez de gravar uma inversão sem prova.
 */
function bestMatch(slotIdx, targets, slotTokens, optTokens) {
  let best = null
  let bestScore = -1
  let secondScore = -1
  for (const p of permutations(targets)) {
    let s = 0
    slotIdx.forEach((si, k) => {
      s += dice(slotTokens[si], optTokens.get(p[k]))
    })
    if (s > bestScore) {
      secondScore = bestScore
      bestScore = s
      best = p
    } else if (s > secondScore) {
      secondScore = s
    }
  }
  const scale = Math.max(1, bestScore)
  return {
    p: best,
    margin: secondScore < 0 ? Infinity : (bestScore - secondScore) / scale,
  }
}

const mode = process.argv.includes('--write') ? 'write' : 'check'
let changed = 0
let manual = 0

for (const file of FILES) {
  const path = `${DATA}/${file}`
  const questions = JSON.parse(readFileSync(path, 'utf8'))
  let fileChanged = 0

  for (const q of questions) {
    const raw = q.explanation || ''
    if (!/[A-E]\s+est[áaã]o?\s+(?:corret|incorret)/i.test(raw)) continue

    const claims = extractClaims(raw)
    if (!claims) continue

    const letters = q.options.map((o) => o.letter.toUpperCase())
    const cited = new Set(claims.flatMap((c) => c.letters))
    if (cited.size !== q.options.length) {
      console.log(
        `AVISO ${q.id}: ${cited.size} letras citadas para ${q.options.length} alternativas`,
      )
      manual += 1
      continue
    }

    const slots = toSlots(claims)
    if (slots.length !== q.options.length) {
      console.log(
        `AVISO ${q.id}: ${slots.length} slots para ${q.options.length} alternativas`,
      )
      manual += 1
      continue
    }

    const slotTokens = slots.map((s) => tokens(s.text))
    const optTokens = new Map(
      q.options.map((o) => [o.letter.toUpperCase(), tokens(o.text)]),
    )
    const truth = new Set(q.correct.map((c) => c.toUpperCase()))

    const correctIdx = slots
      .map((s, i) => (s.verdict === 'correta' ? i : -1))
      .filter((i) => i >= 0)
    const wrongIdx = slots
      .map((s, i) => (s.verdict !== 'correta' ? i : -1))
      .filter((i) => i >= 0)
    const correctTargets = letters.filter((l) => truth.has(l))
    const wrongTargets = letters.filter((l) => !truth.has(l))

    // o veredicto declarado tem de fechar com o gabarito, senão o texto mente
    if (
      correctIdx.length !== correctTargets.length ||
      wrongIdx.length !== wrongTargets.length
    ) {
      console.log(
        `AVISO ${q.id}: veredicto do texto (${correctIdx.length} corretas) não bate com o gabarito (${correctTargets.length})`,
      )
      manual += 1
      continue
    }

    const assign = new Array(slots.length)
    const ties = []
    for (const [idx, targets, label] of [
      [correctIdx, correctTargets, 'corretas'],
      [wrongIdx, wrongTargets, 'incorretas'],
    ]) {
      if (idx.length === 0) continue
      const { p, margin } = bestMatch(idx, targets, slotTokens, optTokens)
      p.forEach((l, k) => {
        assign[idx[k]] = l
      })
      // mais de um slot disputando o mesmo corpo: a bijeção é um empate e a
      // ordem de enumeração decide — precisa de olho humano
      if (margin < MARGIN_FLOOR) {
        ties.push(`${label}: empate (folga ${(margin * 100).toFixed(0)}%)`)
      }
    }
    if (ties.length > 0) {
      console.log(`AVISO ${q.id}: bijeção ${ties.join('; ')}; revisão manual`)
      manual += 1
      continue
    }

    // valve 1: nenhum slot pode ficar irreconhecível
    const weak = []
    for (let i = 0; i < slots.length; i += 1) {
      const s = dice(slotTokens[i], optTokens.get(assign[i]))
      if (s < SIM_FLOOR) weak.push(`${assign[i]}(${s.toFixed(2)})`)
    }
    if (weak.length > 0) {
      console.log(
        `AVISO ${q.id}: corpo não reconhece a alternativa -> ${weak.join(' ')}; revisão manual`,
      )
      manual += 1
      continue
    }

    // regrava o texto com as letras certainadas
    const letterOf = new Map(assign.map((l, i) => [i, l]))
    let out = ''
    let cursor = 0
    let slot = 0
    for (const c of claims) {
      out += raw.slice(cursor, c.start)
      const ls = c.letters.map((_, i) => letterOf.get(slot + i))
      const allCorrect = ls.every((l) => truth.has(l))
      const plural = ls.length > 1
      const verb = allCorrect
        ? plural
          ? 'estão corretas'
          : 'está correta'
        : plural
          ? 'estão incorretas'
          : 'está incorreta'
      out += `${ls.join(ls.length > 2 ? ', ' : ' e ')} ${verb}`
      cursor = c.headEnd
      slot += c.letters.length
    }
    out += raw.slice(cursor)

    // invariante final: cada letra citada uma vez, coerente com o gabarito
    const seen = new Set()
    const mentions = []
    for (const m of out.matchAll(
      /([A-E](?:\s*(?:,|e)\s*[A-E])*)\s+est[áaã]o?\s+(corretas?|incorretas?)/gi,
    )) {
      const isCorrect = m[2].toLowerCase().startsWith('corret')
      for (const L of m[1].split(/\s*(?:,|e)\s*/)) {
        const letter = L.trim().toUpperCase()
        mentions.push([letter, isCorrect])
        if (seen.has(letter)) {
          console.log(
            `AVISO ${q.id}: letra repetida (${letter}); revisão manual`,
          )
          manual += 1
        }
        seen.add(letter)
      }
    }
    const bad = mentions.filter(([l, c]) => truth.has(l) !== c)
    if (bad.length > 0) {
      console.log(
        `AVISO ${q.id}: letra contradiz o gabarito (${bad
          .map(([l]) => l)
          .join(',')}); revisão manual`,
      )
      manual += 1
    }
    if (seen.size !== q.options.length) {
      console.log(`AVISO ${q.id}: ${seen.size} letras citadas; revisão manual`)
      manual += 1
    }
    if (seen.size !== q.options.length || bad.length > 0) continue

    if (out !== raw) {
      q.explanation = out
      fileChanged += 1
      changed += 1
    }
  }

  if (mode === 'write' && fileChanged > 0) {
    writeFileSync(path, `${JSON.stringify(questions, null, 2)}\n`)
  }
  if (fileChanged > 0) {
    console.log(
      `${mode === 'write' ? 'escrito  ' : 'planejado'}: ${file} (${fileChanged})`,
    )
  }
}

console.log(
  `\n${changed} explanations a realinhar; ${manual} com revisão manual.`,
)
