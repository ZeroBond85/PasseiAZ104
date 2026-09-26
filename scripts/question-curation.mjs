// question-curation.mjs — auditoria mensal do banco (Sprint 5, PLAN-3).
// - conta needsReview (gatilho AGENTS.md: >50 = pausar generate, focar review)
// - HEAD nos sourceUrl de community/mslearn
// - totais por domínio + updatedAt do meta.json
// Escreve .agent/audits/curation-AAAA-MM-DD.md. Exit 1 se anomalia
// (workflow abre issue); exit 0 se limpo.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const DATA = new URL('../data/', import.meta.url)
const SKIP = new Set([
  'simulados.json',
  'meta.json',
  'case-studies.json',
  'study-topics.json',
  'exam-syllabus.json',
  'irt-params.json',
])
const TIMEOUT_MS = 12000
const CONCURRENCY = 6
const NEEDS_REVIEW_LIMIT = 50

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
    return res.status >= 200 && res.status < 400 ? null : `HTTP ${res.status}`
  } catch (err) {
    return String(err)
  } finally {
    clearTimeout(t)
  }
}

async function main() {
  const byDomain = new Map()
  const urls = new Set()
  let needsReview = 0
  let total = 0
  for (const f of readdirSync(DATA).filter(
    (f) => f.endsWith('.json') && !SKIP.has(f),
  )) {
    const arr = JSON.parse(readFileSync(new URL(f, DATA), 'utf8'))
    if (!Array.isArray(arr)) continue
    for (const q of arr) {
      total++
      if (q.needsReview === true) needsReview++
      if (typeof q.sourceUrl === 'string' && q.sourceUrl) urls.add(q.sourceUrl)
      if (typeof q.domain === 'string')
        byDomain.set(q.domain, (byDomain.get(q.domain) ?? 0) + 1)
    }
  }
  const meta = JSON.parse(readFileSync(new URL('meta.json', DATA), 'utf8'))

  const dead = []
  const list = [...urls]
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const results = await Promise.all(
      list.slice(i, i + CONCURRENCY).map(async (u) => [u, await head(u)]),
    )
    for (const [u, err] of results) if (err) dead.push({ url: u, error: err })
  }

  const date = new Date().toISOString().slice(0, 10)
  const lines = [
    `# Curadoria do banco — ${date}`,
    '',
    `- Total: **${total}** questões · meta.updatedAt: \`${meta.updatedAt ?? '?'}\``,
    `- needsReview: **${needsReview}** (limite ${NEEDS_REVIEW_LIMIT})`,
    `- sourceUrl únicos: ${list.length} · mortos: ${dead.length}`,
    '',
    '## Por domínio',
    ...[...byDomain.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, n]) => `- ${d}: ${n}`),
  ]
  if (dead.length > 0) {
    lines.push('', '## sourceUrl mortos')
    for (const d of dead) lines.push(`- ${d.url} (${d.error})`)
  }
  writeFileSync(`.agent/audits/curation-${date}.md`, lines.join('\n') + '\n')
  console.log(
    `needsReview=${needsReview} deadUrls=${dead.length} total=${total}`,
  )

  if (needsReview > NEEDS_REVIEW_LIMIT || dead.length > 0) {
    console.error('ANOMALIA: abrir issue de curadoria (ver relatório).')
    process.exit(1)
  }
  console.log('curadoria: limpo')
}

main().catch((err) => {
  console.error(`HARNESS FAIL: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
