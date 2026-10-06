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
  'exam-skills.json',
  'grounding-map.json',
  'irt-params.json',
  // NÃO é uma lista de questões: é o índice numérico das 164 autoavaliações
  // aposentadas no G16 ([0, 1, 2], ...). Contava aqui e inflava o total para
  // 1164, o que tornava toda percentual deste relatório sem sentido
  // (1164 − 164 = 1000 = o invariante do banco).
  'retire_autoeval_ids.json',
])
const TIMEOUT_MS = 12000
// PLAN-4 R4: banco 1000 → ~150-400 URLs únicas; concorrência 10 + 1 retry
// para não estourar o job mensal (timeout 25min no workflow).
const CONCURRENCY = 10
const NEEDS_REVIEW_LIMIT = 50
// Mesmo invariante de scripts/validate-questions.mts. Se o total do banco não
// bater, todo percentual abaixo é lixo — por isso é erro por si só, e não
// apenas uma nota no relatório.
const TOTAL_ESPERADO = 1000

async function headOnce(url) {
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

async function head(url) {
  const first = await headOnce(url)
  if (first === null) return null
  return headOnce(url)
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
  const pctRevisao = total === 0 ? 0 : Math.round((needsReview / total) * 100)
  const lines = [
    `# Curadoria do banco — ${date}`,
    '',
    `- Total: **${total}** questões (invariante: ${TOTAL_ESPERADO}) · meta.updatedAt: \`${meta.updatedAt ?? '?'}\``,
    `- needsReview: **${needsReview}** = ${pctRevisao}% (limite ${NEEDS_REVIEW_LIMIT})`,
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
  writeFileSync(`.agent/audits/curation-${date}.md`, `${lines.join('\n')}\n`)
  console.log(
    `needsReview=${needsReview} (${pctRevisao}%) deadUrls=${dead.length} total=${total}`,
  )

  // Anomalia de banco inteiro em quarentena: este é o estado que quebraria o
  // Gate 1.4/1.1 — filtrar needsReview nos 3 caminhos de estudo serviria ZERO
  // questões. Não sai com 0 "porque a contagem é alta": sai porque o sinal de
  // curadoria deixou de existir.
  const bancoTodoEmQuarentena = total > 0 && needsReview === total
  const totalForaDoInvariante = total !== TOTAL_ESPERADO
  const excedeu = needsReview > NEEDS_REVIEW_LIMIT
  let anomalias = 0
  const erro = (msg) => {
    anomalias++
    console.error(`ANOMALIA: ${msg}`)
  }

  if (bancoTodoEmQuarentena) {
    erro(
      `banco inteiro em quarentena (${needsReview}/${total} = 100%). ` +
        'needsReview perdeu o sentido: um passo de reescrita provavelmente ' +
        'marcou tudo. Serve NÃO filtrar por needsReview até restaurar a curadoria.',
    )
  }
  if (totalForaDoInvariante) {
    erro(
      `total ${total} != invariante ${TOTAL_ESPERADO} (delta ${total - TOTAL_ESPERADO}). ` +
        'Conta de arquivo não-questão ou banco alterado — percentuais acima não valem.',
    )
  }
  if (excedeu && !bancoTodoEmQuarentena) {
    erro(
      `needsReview ${needsReview} > limite ${NEEDS_REVIEW_LIMIT}: pausar generate, focar review.`,
    )
  }
  if (dead.length > 0)
    erro(`${dead.length} sourceUrl morto(s) (ver relatório).`)

  if (anomalias > 0) {
    console.error(
      `curadoria: ${anomalias} anomalia(s) — abrir issue (ver relatório).`,
    )
    process.exit(1)
  }
  console.log('curadoria: limpo')
}

main().catch((err) => {
  console.error(`HARNESS FAIL: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
