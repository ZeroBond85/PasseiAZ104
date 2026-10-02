// syllabus-gap.mts — cruza outline oficial (exam-skills.json) × banco × tópicos curados.
// Uso: npx tsx scripts/syllabus-gap.mts [--md]
// Saída: pesos por domínio + cobertura de tópicos (study-topics.json) + bullets do outline (exam-skills.json).
import { readdirSync, readFileSync } from 'node:fs'

const DATA = new URL('../data/', import.meta.url)
const read = (f: string) => JSON.parse(readFileSync(new URL(f, DATA), 'utf8'))

interface Topic {
  domain: string
  topic: string
  label: string
  match: string[]
}

interface ExamSkillGroup {
  id: string
  label: string
  bullets: string[]
  minorSince: string | null
}

interface ExamSkillDomain {
  domain: string
  label: string
  weight: [number, number]
  groups: ExamSkillGroup[]
}

const syllabus = read('exam-syllabus.json') as {
  skillsOutlineDate: string
  weights: Record<string, [number, number]>
}
const examSkills = read('exam-skills.json') as { domains: ExamSkillDomain[] }
const topics = read('study-topics.json') as Topic[]

const SKIP = new Set([
  'simulados.json',
  'meta.json',
  'case-studies.json',
  'study-topics.json',
  'exam-syllabus.json',
  'exam-skills.json',
  'grounding-map.json',
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

// Subdomínios únicos por domínio (para matching simples de keywords)
const subsByDomain = new Map<string, Set<string>>()
for (const s of subs) {
  const [dom, sub] = s.split('/')
  if (!subsByDomain.has(dom)) subsByDomain.set(dom, new Set())
  subsByDomain.get(dom)?.add(sub.toLowerCase())
}

// Match simples: bullet tem palavra-chave presente no subdomínio?
function bulletHasCoverage(bullet: string, domain: string): boolean {
  const domainSubs = subsByDomain.get(domain)
  if (!domainSubs || domainSubs.size === 0) return false
  const words = bullet
    .toLowerCase()
    .split(/[\s-]+/)
    .filter((w) => w.length > 3)
  return words.some((w) => [...domainSubs].some((sub) => sub.includes(w)))
}

const out: string[] = []
const line = (s: string) => out.push(s)
const _md = process.argv.includes('--md')

line(`# Syllabus gap — outline ${syllabus.skillsOutlineDate}`)
line('')

line('## Pesos × banco')
for (const [d, [lo, hi]] of Object.entries(syllabus.weights)) {
  const n = byDomain.get(d) ?? 0
  line(`- ${d}: banco ${n}q (faixa oficial ${lo}–${hi}%)`)
}
line('')

line('## Tópicos curados sem cobertura no banco (via study-topics.json)')
let topicGaps = 0
for (const t of topics) {
  const hit = [...subs].some((s) =>
    (t.match ?? []).some((p) => s.split('/')[1]?.startsWith(p)),
  )
  if (!hit) {
    topicGaps++
    line(`- ${t.domain}/${t.topic} — ${t.label}`)
  }
}
if (topicGaps === 0) line('- nenhum: todos os tópicos têm ao menos 1 questão')
line('')

line(
  '## Bullets do outline oficial (exam-skills.json) — cobertura por palavra-chave',
)
let totalBullets = 0
let coveredBullets = 0
for (const ed of examSkills.domains) {
  const d = ed.domain
  line(`### ${ed.label}`)
  for (const g of ed.groups) {
    line(`**${g.label}** ${g.minorSince ? `⚠ minorSince ${g.minorSince}` : ''}`)
    for (const b of g.bullets) {
      totalBullets++
      const covered = bulletHasCoverage(b, d)
      if (covered) coveredBullets++
      const mark = covered ? '✅' : '❌'
      line(`  ${mark} ${b}`)
    }
  }
}
line('')
line(
  `**Resumo bullets:** ${coveredBullets}/${totalBullets} cobertos por keyword match (aprox.)`,
)
line('')

if (topicGaps === 0) {
  line('Ação: nenhuma (tópicos curados todos cobertos).')
} else {
  line(
    'Ação: gerar lote via generate-questions.mts (grounding) p/ os tópicos acima.',
  )
}
line('')
line(`*Nota: cobertura de bullets é heurística (keyword match em subdomain).*)
* Para cobertura semântica real, usar \`check-grounding.mts\` (Track R).`)

console.log(out.join('\n'))
