// validate-study-links.mjs — HEAD nas URLs dos tópicos (Sprint 5, PLAN-3).
// Uso: node scripts/validate-study-links.mjs [--fix] [--out report.json]
// --fix: reescreve data/study-topics.json seguindo redirects 301/308.
// Saída stdout: JSON {checked, ok, redirected:[{from,to}], dead:[{url,error}]}.
// Exit sempre 0 (workflow decide PR vs issue); exit 1 só em falha do harness.
import { readFileSync, writeFileSync } from 'node:fs'

const TOPICS = new URL('../data/study-topics.json', import.meta.url)
const TIMEOUT_MS = 12000
const CONCURRENCY = 6

const args = process.argv.slice(2)
const fix = args.includes('--fix')
const outIdx = args.indexOf('--out')
const outFile = outIdx >= 0 ? args[outIdx + 1] : null

async function head(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'PasseiAZ104-link-check/1.0' },
    })
    return { status: res.status, finalUrl: res.url }
  } catch (err) {
    return { status: 0, finalUrl: url, error: String(err) }
  } finally {
    clearTimeout(t)
  }
}

async function main() {
  const topics = JSON.parse(readFileSync(TOPICS, 'utf8'))
  const summary = { checked: topics.length, ok: 0, redirected: [], dead: [] }
  let dirty = false

  for (let i = 0; i < topics.length; i += CONCURRENCY) {
    const batch = topics.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map(async (t) => {
        const r = await head(t.url)
        // Falha de rede (status 0) pode ser transitória: 1 retry antes de declarar morto.
        // HTTP 4xx/5xx não tenta de novo (resposta real do servidor).
        if (r.status === 0) {
          await new Promise((res) => setTimeout(res, 2000))
          return head(t.url)
        }
        return r
      }),
    )
    results.forEach((r, j) => {
      const t = batch[j]
      if (r.status >= 200 && r.status < 300 && r.finalUrl === t.url) {
        summary.ok++
      } else if (r.status >= 200 && r.status < 400 && r.finalUrl !== t.url) {
        summary.redirected.push({ from: t.url, to: r.finalUrl })
        if (fix) {
          t.url = r.finalUrl
          t.last_checked = new Date().toISOString().slice(0, 10)
          dirty = true
        }
      } else {
        summary.dead.push({ url: t.url, error: r.error ?? `HTTP ${r.status}` })
      }
    })
  }

  if (fix && dirty)
    writeFileSync(TOPICS, `${JSON.stringify(topics, null, 2)}\n`)
  const json = JSON.stringify(summary, null, 2)
  if (outFile) writeFileSync(outFile, `${json}\n`)
  console.log(json)
}

main().catch((err) => {
  console.error(`HARNESS FAIL: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
