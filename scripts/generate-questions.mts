// generate-questions.mts — lote S8-S13 §7: 1 req/5s + backoff + checkpoint retomável.
// Uso: tsx scripts/generate-questions.mts --domain storage --count 10 [--dry-run] [--resume] [--limit N]
import { readFileSync, writeFileSync } from 'node:fs'
import { GoogleGenAI } from '@google/genai'

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=')
    return [k.replace(/^--/, ''), v ?? '1']
  }),
)
const DRY = args.has('dry-run')
const DOMAIN = String(args.get('domain') ?? 'storage')
const COUNT = Number(args.get('count') ?? args.get('limit') ?? 10)
const STATE_PATH = new URL('../data/.generation-state.json', import.meta.url)
const MIRROR = `${process.env.HOME ?? '~'}/.az104-gen-state.json`

interface GenState {
  done: number
  target: number
  domain: string
  model: string
  questions: unknown[]
  backoff429: number
}

function loadState(): GenState | null {
  for (const p of [STATE_PATH, MIRROR]) {
    try {
      return JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      // sem estado — começa do zero
    }
  }
  return null
}

function saveState(s: GenState) {
  for (const p of [STATE_PATH, MIRROR]) {
    try {
      writeFileSync(p, JSON.stringify(s, null, 2))
    } catch {
      // espelho pode falhar (ex.: HOME) — checkpoint principal manda
    }
  }
}

const KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? ''
if (!KEY && !DRY) {
  console.error('SEM CHAVE: defina GEMINI_API_KEY')
  process.exit(2)
}

const meta = JSON.parse(
  readFileSync(new URL('../data/meta.json', import.meta.url), 'utf8'),
)
const model = meta.generatedWith?.model ?? 'gemini-3.5-flash-lite'
const state: GenState =
  args.has('resume') && loadState()
    ? (loadState() as GenState)
    : {
        done: 0,
        target: COUNT,
        domain: DOMAIN,
        model,
        questions: [],
        backoff429: 0,
      }

console.log(
  `generate: domain=${state.domain} done=${state.done}/${state.target} model=${state.model}${DRY ? ' DRY-RUN' : ''}`,
)

const ai = DRY ? null : new GoogleGenAI({ apiKey: KEY })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

while (state.done < state.target) {
  if (DRY) {
    state.done++
    saveState(state)
    continue
  }
  try {
    if (!ai) throw new Error('unreachable: DRY já tratado acima')
    const prompt = `Gere 1 questão AZ-104 de ${state.domain} em PT-BR, JSON puro no schema {id,domain,subdomain,type(single),difficulty(medium),question(>=50 chars),options[4x{letter,text}],correct[1],explanation(>=100 chars, porquê de cada erro),source:"ai-generated"}. Sem markdown.`
    const res = await ai.models.generateContent({
      model: state.model,
      contents: prompt,
    })
    const text = (res.text ?? '').replace(/^```json|```$/g, '').trim()
    state.questions.push(JSON.parse(text))
    state.done++
    state.backoff429 = 0
    saveState(state)
    await sleep(5000) // 1 req/5s §7
  } catch (e) {
    const msg = String(e)
    if (msg.includes('429')) {
      state.backoff429++
      if (state.backoff429 >= 3) {
        console.error(
          '3×429 seguidos: pausa diária. Estado salvo — rode com --resume amanhã.',
        )
        saveState(state)
        process.exit(5)
      }
      const wait = [60000, 300000, 1800000][state.backoff429 - 1]
      console.error(`429: backoff ${wait / 1000}s`)
      await sleep(wait)
      continue
    }
    console.error(
      `Falha (checkpoint intacto em ${state.done}/${state.target}): ${msg}`,
    )
    saveState(state)
    process.exit(6)
  }
}

console.log(
  `OK: ${state.done} geradas. Revise em quarentena antes de validar (needsReview:true).`,
)
