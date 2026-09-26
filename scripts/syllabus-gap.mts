// syllabus-gap.mts — cruza outline oficial × banco × tópicos curados.
// Uso: npx tsx scripts/syllabus-gap.mts
// Saída: faltas (prefixo de tópico sem cobertura no banco) + pesos por domínio.
// Roda manual após alerta do exam-watch.yml, ou sob demanda.
import { readdirSync, readFileSync } from 'node:fs'

const DATA = new URL('../data/', import.meta.url)
const read = (f: string) => JSON.parse(readFileSync(new URL(f, DATA), 'utf8'))

interface Topic {
  domain: string
  topic: string
  label: string
  match: string[]
}

const syllabus = read('exam-syllabus.json') as {
  skillsOutlineDate: string
  weights: Record<string, [number, number]>
}
const topics = read('study-topics.json') as Topic[]

const SKIP = new Set([
  'simulados.json',
  'meta.json',
  'case-studies.json',
  'study-topics.json',
  'exam-syllabus.json',
  'irt-params.json',
])
const subs = new Set<string>()
const byDomain = new Map<string, number>()
for (const f of readdirSync(DATA).filter(
  (f) => f.endsWith('.json') && !SKIP.has(f),
)) {
  const arr = read(f)
  if (!Array.isArray(arr)) continue
  for (const q of arr as { domain?: string; subdomain?: string }[]) {
    if (q.subdomain) subs.add(`${q.domain}/${q.subdomain}`)
    if (q.domain) byDomain.set(q.domain, (byDomain.get(q.domain) ?? 0) + 1)
  }
}

const out: string[] = []
const line = (s: string) => out.push(s)

line(`# Syllabus gap — outline ${syllabus.skillsOutlineDate}`)
line('')
line('## Pesos × banco')
for (const [d, [lo, hi]] of Object.entries(syllabus.weights)) {
  const n = byDomain.get(d) ?? 0
  line(`- ${d}: banco ${n}q (faixa oficial ${lo}–${hi}%)`)
}
line('')
line('## Tópicos sem cobertura no banco')
let gaps = 0
for (const t of topics) {
  const hit = [...subs].some((s) =>
    (t.match ?? []).some((p) => s.split('/')[1]?.startsWith(p)),
  )
  if (!hit) {
    gaps++
    line(`- ${t.domain}/${t.topic} — ${t.label}`)
  }
}
if (gaps === 0) line('- nenhum: todos os tópicos têm ao menos 1 questão')
line('')
line(
  gaps > 0
    ? 'Ação: gerar lote via generate-questions.mts (grounding) p/ os tópicos acima.'
    : 'Ação: nenhuma.',
)

console.log(out.join('\n'))
