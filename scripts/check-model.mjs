// check-model.mjs — pré-voo §7: 1º candidato com 200 vira meta.json.generatedWith.
import { readFileSync, writeFileSync } from 'node:fs'

const CANDIDATES = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3-flash',
]
const KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? ''

if (!KEY) {
  console.error('SEM CHAVE: defina GEMINI_API_KEY (nunca commite .env)')
  process.exit(2)
}

let chosen = null
for (const model of CANDIDATES) {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
        signal: ctrl.signal,
      },
    )
    clearTimeout(timer)
    if (res.status === 200) {
      chosen = model
      break
    }
    if (res.status === 404) continue // próximo candidato
    if (res.status === 401) {
      console.error('401: troque a chave')
      process.exit(3)
    }
    if (res.status === 429) {
      console.error(
        `429 em ${model}: backoff — tente de novo em alguns minutos`,
      )
      continue
    }
    console.error(`${model}: HTTP ${res.status}`)
  } catch (e) {
    console.error(`${model}: ${e.message} — próximo`)
  }
}

if (!chosen) {
  console.error(
    'Nenhum candidato respondeu 200. Verifique chave/quota e rode de novo.',
  )
  process.exit(4)
}

const metaPath = new URL('../data/meta.json', import.meta.url)
const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
meta.generatedWith = { model: chosen, date: new Date().toISOString() }
writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`)
console.log(`OK: ${chosen} gravado em meta.json.generatedWith`)
