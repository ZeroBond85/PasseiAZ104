// check-grounding.mts — invariante de grounding (PLAN-4 R1).
// Uso: npx tsx scripts/check-grounding.mts [--threshold 0.5] [--no-cache]
// Para cada questão com sourceUrl: baixa a página (cache .agent/cache/grounding,
// TTL 7 dias), mede a cobertura lexical do STEM + TEXTO DA(S) ALTERNATIVA(S)
// CORRETA(S) no texto da página. A explicação (porquê de cada erro, §4.1) cita
// conceitos fora da página por construção — medi-la penalizaria explicação boa.
// Cobertura < threshold → aponta a questão. Exit 1 se houver apontamentos
// (gata o job mensal + a revisão de cada lote).
// Honesto sobre o limite: filtro de plausibilidade, não prova semântica — pega
// ancoragem preguiçosa (página errada, índice genérico), não substitui revisão humana.
// Calibração 27/set (4 amostras): âncoras certas 0.56/0.57/0.48, âncora errada de
// propósito (blob→página de VMs) 0.19/0.37 → limiar 0.5 separa todos os casos
// medidos. Re-verificar o limiar se o estilo dos stems mudar (G14).
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'

const DATA = new URL('../data/', import.meta.url)
const CACHE = new URL('../.agent/cache/grounding/', import.meta.url)
const SKIP = new Set([
  'simulados.json',
  'meta.json',
  'case-studies.json',
  'study-topics.json',
  'exam-syllabus.json',
  'exam-skills.json',
  'grounding-map.json',
  'irt-params.json',
  '.generation-state.json',
])

// Aceita as duas formas: `--threshold=0.5` e `--threshold 0.5`. A versão
// anterior só entendia a primeira; na segunda o valor caía em `?? '1'` e o
// limiar virava 1 silenciosamente, com as 50/51 questões marcadas como
// "apontada" e exit 1 — o gate virava vermelho por um argumento mal parseado.
const args = new Map<string, string>()
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i]
  if (!a.startsWith('--')) throw new Error(`argumento inesperado: ${a}`)
  const [k, inline] = a.slice(2).split('=')
  const next = argv[i + 1]
  if (inline !== undefined) {
    args.set(k, inline)
  } else if (next !== undefined && !next.startsWith('--')) {
    args.set(k, next)
    i += 1
  } else {
    args.set(k, 'true')
  }
}
// 0.5 é o limiar calibrado do PLAN-4 §R1 (medido 29/set: 0 apontadas em 51
// questões, e o único apontado era uma âncora que de fato podia melhorar —
// `co-233` passou de `move-support-resources` para `move-region`). O default
// antigo era 0.3, que deixa passar âncora propositadamente errada (medida 0.37).
// Falso positivo custa revisão humana; falso negativo deixa banco errado.
const THRESHOLD = Number(args.get('threshold') ?? '0.5')
if (!Number.isFinite(THRESHOLD) || THRESHOLD <= 0 || THRESHOLD > 1) {
  throw new Error(`limiar inválido: ${args.get('threshold')}`)
}
const NO_CACHE = args.has('no-cache')
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000
const FETCH_TIMEOUT_MS = 20000
const UA = 'PasseiAZ104-grounding-check/1.0'

const STOP = new Set([
  'para',
  'com',
  'uma',
  'dos',
  'das',
  'nos',
  'nas',
  'que',
  'como',
  'seu',
  'sua',
  'seus',
  'suas',
  'este',
  'esta',
  'isto',
  'isso',
  'entre',
  'sobre',
  'pela',
  'pelo',
  'por',
  'aos',
  'the',
  'and',
  'for',
  'with',
  'from',
  'você',
  'qual',
  'quais',
  'quando',
  'onde',
  'como',
  'cada',
  'todo',
  'toda',
  'todos',
  'todas',
  'ser',
  'são',
  'foi',
  'foram',
  'tem',
  'têm',
  'mais',
  'menos',
  'muito',
  'pode',
  'devem',
  'deve',
  'caso',
  'caso',
  'apenas',
  'também',
  'ainda',
  'então',
  'pois',
  'porque',
  'através',
])
// Termos genéricos demais para provar cobertura (aparecem em qualquer página).
const GENERIC = new Set([
  'azure',
  'microsoft',
  'portal',
  'serviço',
  'serviços',
  'recurso',
  'recursos',
  'conta',
  'grupo',
  'região',
  'assinatura',
  'gerenciar',
  'configurar',
  'criar',
  'usar',
  'utilizar',
  'através',
  'usando',
])

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

function tokens(text: string): Set<string> {
  const out = new Set<string>()
  for (const w of norm(text).split(' ')) {
    if (w.length >= 5 && !STOP.has(w) && !GENERIC.has(w)) out.add(w)
  }
  return out
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#\d+;|&\w+;/g, ' ')
}

function cachePath(url: string): string {
  const h = createHash('sha1').update(url).digest('hex')
  return new URL(`${h}.txt`, CACHE).pathname
}

async function fetchPage(url: string): Promise<string | null> {
  const cp = cachePath(url)
  if (!NO_CACHE && existsSync(cp)) {
    const age = Date.now() - statSync(cp).mtimeMs
    if (age < CACHE_TTL_MS) return readFileSync(cp, 'utf8')
  }
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': UA },
    })
    if (!res.ok) return null
    const text = stripHtml(await res.text())
    mkdirSync(CACHE, { recursive: true })
    writeFileSync(cp, text)
    return text
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

interface Q {
  id: string
  question: string
  explanation: string
  options?: { letter: string; text: string }[]
  correct?: string[]
  sourceUrl?: string
}

// O fato ancorado vive no stem + na(s) alternativa(s) correta(s). A explicação
// (porquê de cada erro, §4.1) cita conceitos fora da página por construção —
/// medi-la penalizaria explicação boa. Por isso só stem + correct entram no cálculo.
function anchoredText(q: Q): string {
  const letters = new Set(q.correct ?? [])
  const correctText = (q.options ?? [])
    .filter((o) => letters.has(o.letter))
    .map((o) => o.text)
    .join(' ')
  return `${q.question} ${correctText}`
}

async function main() {
  const questions: (Q & { file: string })[] = []
  for (const f of readdirSync(DATA).filter(
    (f) => f.endsWith('.json') && !SKIP.has(f),
  )) {
    const arr = JSON.parse(readFileSync(new URL(f, DATA), 'utf8'))
    if (!Array.isArray(arr)) continue
    for (const q of arr) {
      if (typeof q?.sourceUrl === 'string' && q.sourceUrl)
        questions.push({ ...q, file: f })
    }
  }
  if (questions.length === 0) {
    console.log('grounding: nenhuma questão com sourceUrl (nada a verificar)')
    return
  }
  // Uma questão por URL? Não — agrupa por URL para baixar 1× cada.
  const byUrl = new Map<string, (Q & { file: string })[]>()
  for (const q of questions) {
    const url = q.sourceUrl
    if (!url) continue
    const l = byUrl.get(url) ?? []
    l.push(q)
    byUrl.set(url, l)
  }
  // União com extraUrls do mesmo bullet (PLAN-4 R0): questão ancorada em 2 páginas
  // (ex.: move ARM + Site Recovery) mede cobertura na UNIÃO. Falha de extra não
  // reprova — só a primária conta como fetch-falhou.
  const urlToBulletUrls = new Map<string, string[]>()
  try {
    const gm = JSON.parse(
      readFileSync(
        new URL('../data/grounding-map.json', import.meta.url),
        'utf8',
      ),
    ) as { bullets?: Record<string, { url?: string; extraUrls?: string[] }> }
    for (const b of Object.values(gm.bullets ?? {})) {
      const all = [b.url, ...(b.extraUrls ?? [])].filter(
        (u): u is string => typeof u === 'string' && !!u,
      )
      for (const u of all) urlToBulletUrls.set(u, all)
    }
  } catch {
    // sem mapa — mede só a primária
  }
  let flagged = 0
  let checked = 0
  let fetchFails = 0
  for (const [url, qs] of byUrl) {
    const page = await fetchPage(url)
    if (page === null) {
      fetchFails++
      console.log(`FETCH-FALHOU ${url} (${qs.map((q) => q.id).join(',')})`)
      continue
    }
    const related = (urlToBulletUrls.get(url) ?? [url]).filter((u) => u !== url)
    const pageTokens = tokens(page)
    for (const extra of related) {
      const extraPage = await fetchPage(extra)
      if (extraPage !== null)
        for (const t of tokens(extraPage)) pageTokens.add(t)
    }
    for (const q of qs) {
      const qTokens = tokens(anchoredText(q))
      if (qTokens.size < 5) {
        console.log(`INCONCLUSIVO ${q.id} (poucos termos) — revisão humana`)
        flagged++
        continue
      }
      const hit = [...qTokens].filter((t) => pageTokens.has(t)).length
      const cov = hit / qTokens.size
      checked++
      if (cov < THRESHOLD) {
        flagged++
        console.log(
          `APONTADA ${q.id} [${q.file}] cobertura ${cov.toFixed(2)} < ${THRESHOLD} :: ${url}`,
        )
      }
    }
  }
  console.log(
    `grounding: ${checked} verificadas, ${flagged} apontadas, ${fetchFails} fetch-falhou (limiar ${THRESHOLD})`,
  )
  process.exit(flagged > 0 || fetchFails > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(`HARNESS FAIL: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
