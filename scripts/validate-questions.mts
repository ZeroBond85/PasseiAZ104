// validate-questions.mts — Zod §3 + cross-file (FK caseStudyId, ids únicos, FNV-1a dedup).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateQuestion } from '../src/engine/question-schema.js'
import {
  normText,
  SEMANTIC_HIGH,
  SEMANTIC_MEDIUM,
  textSimilarity,
} from '../src/engine/similarity.js'

const DATA = new URL('../data/', import.meta.url)
const CASES = new URL('../data/case-studies.json', import.meta.url)

// INVARIANTE DO PROJETO — 1000 questões é a capa do produto, não um número
// de conveniência. Encolher o banco é regressão de escopo; crescer além disso
// exige decisão explícita, não puxão de PR. Até aqui o validate só *informava*
// a contagem no console.log final, então apagar questões mantinha o CI verde:
// contagem sem fail() é métrica, não invariante.
const TOTAL_ESPERADO = 1000

function fnv1a64(s: string): string {
  let h1 = 0xcbf29ce4
  let h2 = 0xcbf29ce4
  const norm = s.toLowerCase().replace(/\s+/g, ' ').trim()
  for (let i = 0; i < norm.length; i++) {
    const c = norm.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619)
    h2 = Math.imul(h2 ^ (c + 31), 16777619)
  }
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  )
}

let errors = 0
let total = 0
const ids = new Set<string>()
const hashes = new Set<string>()
const byDomain = new Map<string, { id: string; question: string }[]>()
const fail = (msg: string) => {
  errors++
  console.error(`ERRO: ${msg}`)
}

let caseIds = new Set<string>()
try {
  const cases = JSON.parse(readFileSync(CASES, 'utf8'))
  caseIds = new Set(
    (Array.isArray(cases) ? cases : []).map((c: { id: string }) => c.id),
  )
} catch {
  // case-studies.json ainda não existe (S6) — FK validada quando existir
}

// PLAN-4 R2: toda sourceUrl `mslearn` precisa existir no grounding-map
// (impede URL solta/drift). `community` fica isenta.
const GROUNDING_URLS = new Set<string>()
let GROUNDING_BULLETS = 0
let GROUNDING_FILLED = 0
try {
  const gm = JSON.parse(
    readFileSync(
      new URL('../data/grounding-map.json', import.meta.url),
      'utf8',
    ),
  ) as {
    bullets?: Record<string, { url?: string; extraUrls?: string[] }>
  }
  const values = Object.values(gm.bullets ?? {})
  GROUNDING_BULLETS = values.length
  for (const b of values) {
    if (typeof b.url === 'string' && b.url) {
      GROUNDING_URLS.add(b.url)
      GROUNDING_FILLED += 1
    }
    for (const u of b.extraUrls ?? []) GROUNDING_URLS.add(u)
  }
} catch {
  // grounding-map.json ausente — trava desligada (R0 ainda não rodou)
}

const files = readdirSync(DATA).filter(
  (f) =>
    f.endsWith('.json') &&
    ![
      'simulados.json',
      'meta.json',
      'case-studies.json',
      'study-topics.json',
      'exam-syllabus.json',
      'exam-skills.json',
      'grounding-map.json',
      'anchor-map.json',
      'retire_autoeval_ids.json',
      '.generation-state.json',
    ].includes(f),
)
const banks: unknown[][] = []
for (const f of files) {
  // fileURLToPath, nao DATA.pathname: sob o share UNC o pathname ja vem com o
  // nome do share (/Debian/home/...) e o win32.join prefixa a raiz de novo,
  // produzindo \\wsl$\Debian\Debian\home\... . No Linux os dois coincidem,
  // entao o bug so aparece no Windows.
  const arr = JSON.parse(readFileSync(join(fileURLToPath(DATA), f), 'utf8'))
  if (!Array.isArray(arr)) {
    fail(`${f}: raiz deve ser array`)
    continue
  }
  banks.push(arr)
  for (const q of arr) {
    total++
    const r = validateQuestion(q)
    if (!r.success) {
      fail(
        `${f} ${(q as { id?: string }).id ?? '?'}: ${r.error.issues[0]?.message}`,
      )
      continue
    }
    const id = (q as { id: string }).id
    if (ids.has(id)) fail(`id duplicado: ${id}`)
    ids.add(id)
    const h = fnv1a64(`${(q as { question: string }).question}`)
    if (hashes.has(h)) fail(`conteúdo duplicado (FNV-1a): ${id}`)
    hashes.add(h)
    const qd = q as { domain?: string }
    if (typeof qd.domain === 'string') {
      const list = byDomain.get(qd.domain) ?? []
      list.push({ id, question: (q as { question: string }).question })
      byDomain.set(qd.domain, list)
    }
    const qq = q as { type: string; caseStudyId?: string }
    if (
      qq.type === 'case-study' &&
      caseIds.size > 0 &&
      !caseIds.has(qq.caseStudyId ?? '')
    ) {
      fail(`caseStudyId órfão: ${id} → ${qq.caseStudyId}`)
    }
    const qs = q as { source?: string; sourceUrl?: string }
    if (
      qs.source === 'mslearn' &&
      GROUNDING_URLS.size > 0 &&
      typeof qs.sourceUrl === 'string' &&
      !GROUNDING_URLS.has(qs.sourceUrl)
    ) {
      fail(`sourceUrl fora do grounding-map: ${id} → ${qs.sourceUrl}`)
    }
  }
}

// ---- integridade dos simulados oficiais (Gate 1.1) ----
// O conserto do Gate 1.1 foi no DADO (trocar 37 slots), nao em filtro de
// runtime: filtrar encolheria cada oficial de 50 para 44-48 e quebraria o
// blueprint. Logo a garantia tem de morar aqui, no CI — um needsReview que
// entrar num oficial por regressao de geracao precisa reprovar.
//
// TAMANHO_OFICIAL vem da prova (50 itens), nao de `simulados.json`: derivar o
// esperado dos proprios dados que se esta conferindo tornaria o check tautologico
// (foi exatamente o que aconteceu na primeira versao deste guard, que lia
// `questionCount` — campo que os fixos nem declaram).
const TAMANHO_OFICIAL = 50
{
  const porId = new Map<
    string,
    { needsReview?: boolean; domain?: string; difficulty?: string }
  >()
  for (const arr of banks)
    for (const q of arr) {
      const o = q as {
        id?: string
        needsReview?: boolean
        domain?: string
        difficulty?: string
      }
      if (typeof o.id === 'string') porId.set(o.id, o)
    }
  const sims = JSON.parse(
    readFileSync(join(fileURLToPath(DATA), 'simulados.json'), 'utf8'),
  ) as { id?: string; mode?: string; questionIds?: string[] }[]
  const fixos = sims.filter((s) => s.mode === 'fixed')
  for (const s of fixos) {
    const lista = (s.questionIds ?? []).map(String)
    if (lista.length !== TAMANHO_OFICIAL)
      fail(
        `${s.id}: ${lista.length} questões, esperava ${TAMANHO_OFICIAL} (blueprint da prova quebrado)`,
      )
    const vistos = new Set<string>()
    for (const qid of lista) {
      if (vistos.has(qid)) fail(`${s.id}: id repetido no simulado → ${qid}`)
      vistos.add(qid)
      const q = porId.get(qid)
      if (!q) {
        fail(`${s.id}: id inexistente no banco → ${qid}`)
        continue
      }
      if (q.needsReview === true)
        fail(`${s.id}: questão em quarentena (needsReview) → ${qid}`)
    }
  }
  console.log(
    `simulados: ${fixos.length} oficiais · ${TAMANHO_OFICIAL} itens cada · 0 needsReview exigido · ids conferidos`,
  )
}

// Honestidade do R0: mapa parcial significa que as âncoras aceitas hoje são
// só as verificadas até agora. O relatório é sempre impresso — silêncio seria
// ambíguo entre "completo" e "checagem desligada", que é o false green que o
// guard abaixo existe para impedir.
if (GROUNDING_FILLED < GROUNDING_BULLETS) {
  console.log(
    `grounding-map: ${GROUNDING_FILLED}/${GROUNDING_BULLETS} bullets com URL — R2 parcial (URLs de bullet sem âncora não são rejeitadas)`,
  )
} else if (GROUNDING_BULLETS > 0) {
  console.log(
    `grounding-map: ${GROUNDING_FILLED}/${GROUNDING_BULLETS} bullets com URL — R2 completo (toda sourceUrl mslearn é rejeitada se fora do mapa)`,
  )
}

// PLAN-4 C5: validade do gabarito. O banco nasceu com 657/730 gabaritos em A e
// 268/270 pares "AB" — um candidato que "nunca marca C/D" acerta ~90%. Gate
// duro sobre a distribuição; usa só o subconjunto de 4 alternativas, que é o
// formato do AZ-104 (2 e 3 alternativas entram no relatório de qualidade).
{
  const four = new Map<string, number>()
  const pairs = new Map<string, number>()
  for (const arr of banks) {
    for (const q of arr) {
      const opts = (q as { options: { letter: string }[] }).options
      const correct = (q as { correct: string[] }).correct
      if (correct.length === 1 && opts.length === 4) {
        four.set(correct[0], (four.get(correct[0]) ?? 0) + 1)
      } else if (correct.length > 1) {
        const key = correct.slice().sort().join('')
        pairs.set(key, (pairs.get(key) ?? 0) + 1)
      }
    }
  }

  const fourTotal = [...four.values()].reduce((s, n) => s + n, 0)
  if (fourTotal >= 20) {
    for (const letter of ['A', 'B', 'C', 'D']) {
      const n = four.get(letter) ?? 0
      const pct = (n / fourTotal) * 100
      if (pct < 20 || pct > 30) {
        fail(
          `gabarito enviesado: ${letter} aparece em ${n}/${fourTotal} (${pct.toFixed(1)}%) das de 4 alternativas; esperado 20–30%`,
        )
      }
    }
  }

  const pairTotal = [...pairs.values()].reduce((s, n) => s + n, 0)
  if (pairTotal >= 20) {
    for (const [key, n] of pairs) {
      const pct = (n / pairTotal) * 100
      if (pct > 25) {
        fail(
          `par de múltipla escolha enviesado: ${key} em ${n}/${pairTotal} (${pct.toFixed(1)}%); esperado ≤25%`,
        )
      }
    }
  }

  // Backlog de conteúdo: não reprova, mas fica registrado e versionado.
  const twoOpt: string[] = []
  const tautology: string[] = []
  const shortStem: string[] = []
  const thinExpl: string[] = []
  for (const arr of banks) {
    for (const q of arr) {
      const id = (q as { id: string }).id
      const opts = (q as { options: { letter: string; text: string }[] })
        .options
      const correct = (q as { correct: string[] }).correct
      const stem = (q as { question: string }).question
      if (opts.length < 4) twoOpt.push(`${id} (${opts.length} alternativas)`)
      if (stem.split(/\s+/).length < 15) shortStem.push(id)
      if ((q as { explanation: string }).explanation.split(/\s+/).length < 30) {
        thinExpl.push(id)
      }
      const stemNorm = normText(stem)
      for (const c of correct) {
        const text = opts.find((o) => o.letter === c)?.text
        if (!text) continue
        const core = normText(text)
        if (core.length > 8 && stemNorm.includes(core)) {
          tautology.push(`${id} (enunciado já contém o gabarito)`)
          break
        }
      }
    }
  }

  // A explanation não pode citar letra ("A está correta") que contradiga o
  // gabarito: o shuffle reatribui as letras, então texto e gabarito saem de
  // sincronia. Reprova, porque é erro de correção visível ao aluno.
  const letterMismatch: string[] = []
  for (const arr of banks) {
    for (const q of arr) {
      const qid = (q as { id: string }).id
      const expl = (q as { explanation: string }).explanation
      if (!/[A-E]\s+est[áaã]o?\s+(?:corret|incorret)/i.test(expl)) continue
      const truth = new Set(
        (q as { correct: string[] }).correct.map((c) => c.toUpperCase()),
      )
      const claims: [string, boolean][] = []
      for (const m of expl.matchAll(
        /([A-E](?:\s*(?:,|e)\s*[A-E])*)\s+(?:est[áaã]o?\s+)(corretas?|incorretas?)/gi,
      )) {
        const isCorrect = m[2].toLowerCase().startsWith('corret')
        for (const L of m[1].split(/\s*(?:,|e)\s*/)) {
          const letter = L.trim().toUpperCase()
          if (letter) claims.push([letter, isCorrect])
        }
      }
      const bad = claims.filter(([L, isCorrect]) => truth.has(L) !== isCorrect)
      // letra repetida: a mesma alternativa sendo julgada duas vezes é sempre
      // erro de geração (sinaliza remapeamento que perdeu a bijeção).
      const seen = new Set<string>()
      const dups: string[] = []
      for (const [L] of claims) {
        if (seen.has(L)) dups.push(L)
        else seen.add(L)
      }
      if (bad.length > 0) {
        letterMismatch.push(
          `${qid} (${bad
            .map(([L, c]) => `${L} dita ${c ? 'correta' : 'incorreta'}`)
            .join(', ')}; gabarito ${[...truth].join('')})`,
        )
      } else if (dups.length > 0) {
        letterMismatch.push(`${qid} (letra repetida: ${dups.join(',')})`)
      }
    }
  }
  for (const l of letterMismatch) {
    fail(`explanation contradiz o gabarito: ${l}`)
  }

  const date = new Date().toISOString().slice(0, 10)
  mkdirSync(new URL('../.agent/audits/', import.meta.url), { recursive: true })
  writeFileSync(
    new URL(`../.agent/audits/qualidade-${date}.md`, import.meta.url),
    [
      `# Backlog de qualidade — ${date}`,
      '',
      'Gerado por `npm run validate`. Não reprova o CI; é a fila de conteúdo.',
      '',
      `## Menos de 4 alternativas: ${twoOpt.length} (reprova no simulador real)`,
      ...twoOpt.map((l) => `- ${l}`),
      '',
      `## Enunciado tautológico: ${tautology.length}`,
      ...tautology.map((l) => `- ${l}`),
      '',
      `## Enunciado com < 15 palavras: ${shortStem.length}`,
      ...shortStem.map((l) => `- ${l}`),
      '',
      `## Explicação com < 30 palavras: ${thinExpl.length}`,
      ...thinExpl.map((l) => `- ${l}`),
      '',
    ].join('\n'),
  )
  console.log(
    `qualidade: gabarito 4op ${[...four.entries()]
      .sort()
      .map(([k, n]) => `${k}=${n}`)
      .join(
        ' ',
      )} | backlog <4op=${twoOpt.length} taut=${tautology.length} curto=${shortStem.length} rasa=${thinExpl.length}`,
  )
}

// PLAN-4 C4: dedup semântico (FNV só pega texto idêntico). Pares no mesmo
// domínio com Jaccard ≥ HIGH reprovam; ≥ MEDIUM vão para relatório.
// Calibração banco 1000 (27/set): HIGH=0 pares, MED=1 par — limiares 0.85/0.7.
{
  const highs: string[] = []
  const mediums: string[] = []
  for (const [d, qs] of byDomain) {
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        if (normText(qs[i].question) === normText(qs[j].question)) continue
        const s = textSimilarity(qs[i].question, qs[j].question)
        const line = `${s.toFixed(2)} ${qs[i].id} <-> ${qs[j].id} [${d}]`
        if (s >= SEMANTIC_HIGH) highs.push(line)
        else if (s >= SEMANTIC_MEDIUM) mediums.push(line)
      }
    }
  }
  if (mediums.length > 0 || highs.length > 0) {
    const date = new Date().toISOString().slice(0, 10)
    const report = [
      `# Dedup semântico — ${date}`,
      '',
      `Pares altos (≥${SEMANTIC_HIGH}, erro): ${highs.length}`,
      ...highs.map((l) => `- ${l}`),
      '',
      `Pares médios (≥${SEMANTIC_MEDIUM}, revisar): ${mediums.length}`,
      ...mediums.map((l) => `- ${l}`),
      '',
    ].join('\n')
    mkdirSync(new URL('../.agent/audits/', import.meta.url), {
      recursive: true,
    })
    writeFileSync(
      new URL(`../.agent/audits/semantic-dedup-${date}.md`, import.meta.url),
      report,
    )
    console.log(
      `semantic-dedup: ${highs.length} altos, ${mediums.length} médios (relatório em .agent/audits/)`,
    )
  }
  for (const h of highs) fail(`paráfrase provável (Jaccard): ${h}`)
}

if (total !== TOTAL_ESPERADO)
  fail(
    `banco com ${total} questões; o invariante do projeto exige ${TOTAL_ESPERADO}` +
      ` (${total > TOTAL_ESPERADO ? `+${total - TOTAL_ESPERADO}` : total - TOTAL_ESPERADO})`,
  )

console.log(`validate: ${total} questões, ${errors} erros`)
process.exit(errors > 0 ? 1 : 0)
