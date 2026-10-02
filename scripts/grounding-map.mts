// grounding-map.mts — mapa bullet oficial → URL pt-br (fonte de verdade de provenance, PLAN-4 R0).
// Uso:
//   npx tsx scripts/grounding-map.mts --inventory   → relatório: bullets sem proposta + subdomains sem bullet
//   npx tsx scripts/grounding-map.mts --init        → escreve data/grounding-map.json com os 82 bullets (url=null)
// Chaves do mapa = 82 bullets de data/exam-skills.json (conjunto fixo, curadoria única).
// Atribuição questão→bullet: keyword propõe, humano confirma (B2/R3). Stems observados acumulam no mapa.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

const DATA = new URL('../data/', import.meta.url)
const read = (f: string) => JSON.parse(readFileSync(new URL(f, DATA), 'utf8'))

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

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

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
  'the',
  'and',
  'for',
  'with',
  'from',
  'uma',
  'por',
  'das',
  'aos',
  'azure',
  'gerenciar',
  'configurar',
  'criar',
  'usar',
  'usando',
  'atraves',
])

function keywords(text: string): Set<string> {
  const out = new Set<string>()
  for (const w of norm(text).split(' ')) {
    if (w.length >= 4 && !STOP.has(w)) out.add(w)
  }
  return out
}

function stem(sub: string): string {
  return sub.replace(/-(multiplos|conceito)$/, '')
}

interface Bullet {
  id: string
  domain: string
  groupId: string
  groupLabel: string
  label: string
  minorSince: string | null
  keys: Set<string>
}

function loadBullets(): Bullet[] {
  const skills = read('exam-skills.json') as { domains: ExamSkillDomain[] }
  const out: Bullet[] = []
  for (const ed of skills.domains) {
    for (const g of ed.groups) {
      g.bullets.forEach((b, i) => {
        out.push({
          id: `${g.id}#${i + 1}`,
          domain: ed.domain,
          groupId: g.id,
          groupLabel: g.label,
          label: b,
          minorSince: g.minorSince,
          keys: keywords(`${g.label} ${b}`),
        })
      })
    }
  }
  return out
}

function loadSubdomains(): Map<string, { domain: string; count: number }> {
  const map = new Map<string, { domain: string; count: number }>()
  for (const f of readdirSync(DATA).filter(
    (f) => f.endsWith('.json') && !SKIP.has(f),
  )) {
    const arr = read(f)
    if (!Array.isArray(arr)) continue
    for (const q of arr as { domain?: string; subdomain?: string }[]) {
      if (typeof q?.subdomain !== 'string') continue
      const e = map.get(q.subdomain) ?? { domain: q.domain ?? '?', count: 0 }
      e.count++
      map.set(q.subdomain, e)
    }
  }
  return map
}

// Proposta: subdomain → bullets do MESMO domínio com ≥2 keywords em comum (stem + bullet).
function propose(sub: string, domain: string, bullets: Bullet[]): Bullet[] {
  const sk = keywords(stem(sub).replace(/-/g, ' '))
  if (sk.size === 0) return []
  return bullets
    .filter((b) => b.domain === domain)
    .map((b) => ({
      b,
      score: [...sk].filter((k) => b.keys.has(k)).length,
    }))
    .filter((r) => r.score >= 2)
    .sort((a, b2) => b2.score - a.score)
    .map((r) => r.b)
}

function inventory() {
  const bullets = loadBullets()
  const subs = loadSubdomains()
  const bulletHits = new Map<string, string[]>()
  const unmapped: string[] = []
  for (const [sub, info] of subs) {
    const p = propose(sub, info.domain, bullets)
    if (p.length === 0) {
      unmapped.push(`${info.domain}/${sub} (×${info.count})`)
    } else {
      for (const b of p.slice(0, 2)) {
        const l = bulletHits.get(b.id) ?? []
        l.push(sub)
        bulletHits.set(b.id, l)
      }
    }
  }
  const gapBullets = bullets.filter((b) => !bulletHits.has(b.id))
  const lines = [
    '# Grounding inventory — bullets oficiais × subdomains do banco',
    '',
    `- bullets: ${bullets.length} · subdomains distintos: ${subs.size}`,
    `- bullets SEM proposta de cobertura: **${gapBullets.length}** (= spec do B2)`,
    `- subdomains SEM bullet proposto: **${unmapped.length}** (revisão humana no R3)`,
    '',
    '## Bullets sem cobertura proposta (spec B2)',
  ]
  for (const b of gapBullets) {
    lines.push(
      `- [${b.domain}] ${b.groupLabel} :: ${b.label}${b.minorSince ? ` ⚠ minorSince ${b.minorSince}` : ''}`,
    )
  }
  lines.push('', '## Subdomains sem bullet proposto (amostra, R3)')
  for (const u of unmapped.slice(0, 40)) lines.push(`- ${u}`)
  if (unmapped.length > 40)
    lines.push(`- … +${unmapped.length - 40} (ver JSON do inventário)`)
  console.log(lines.join('\n'))
}

function init() {
  const bullets = loadBullets()
  const map: Record<
    string,
    {
      domain: string
      groupId: string
      label: string
      minorSince: string | null
      url: null
      verifiedAt: null
    }
  > = {}
  for (const b of bullets) {
    map[b.id] = {
      domain: b.domain,
      groupId: b.groupId,
      label: b.label,
      minorSince: b.minorSince,
      url: null,
      verifiedAt: null,
    }
  }
  const doc = {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: 'data/exam-skills.json (outline 2026-04-17)',
    bullets: map,
    stems: {},
  }
  writeFileSync(
    new URL('../data/grounding-map.json', import.meta.url),
    `${JSON.stringify(doc, null, 2)}\n`,
  )
  console.log(
    `grounding-map.json: ${bullets.length} bullets (url=null, curadoria pendente)`,
  )
}

interface TopicExtra {
  domain: string
  label: string
  url: string | null
  verifiedAt: string | null
}

interface GroundingMap {
  bullets: Record<
    string,
    {
      domain: string
      groupId: string
      label: string
      minorSince: string | null
      url: string | null
      verifiedAt: string | null
      extraUrls?: string[]
    }
  >
  topicExtras?: Record<string, TopicExtra>
}

function loadMap(): GroundingMap {
  return read('grounding-map.json') as GroundingMap
}

// Proposta por questão: keywords de (subdomain + enunciado) × bullets do domínio
// e topicExtras. Saída JSON p/ revisão humana (B2/R3). Uso:
//   npx tsx scripts/grounding-map.mts --propose --domain identidade-governanca
function proposeQuestions(domain: string) {
  const bullets = loadBullets().filter((b) => b.domain === domain)
  const map = loadMap()
  const extras = Object.entries(map.topicExtras ?? {})
    .filter(([, e]) => e.domain === domain)
    .map(([key, e]) => ({ key, keys: keywords(e.label) }))
  const out: {
    id: string
    subdomain: string
    bullet?: string
    bulletScore?: number
    extra?: string
    extraScore?: number
  }[] = []
  for (const f of readdirSync(DATA).filter(
    (f) => f.endsWith('.json') && !SKIP.has(f),
  )) {
    const arr = read(f)
    if (!Array.isArray(arr)) continue
    for (const q of arr as {
      id?: string
      domain?: string
      subdomain?: string
      question?: string
      source?: string
    }[]) {
      if (q?.domain !== domain || q?.source !== 'original') continue
      const qk = keywords(
        `${stem(String(q.subdomain ?? '')).replace(/-/g, ' ')} ${q.question ?? ''}`,
      )
      let best: Bullet | null = null
      let bestScore = 0
      for (const b of bullets) {
        const s = [...qk].filter((k) => b.keys.has(k)).length
        if (s > bestScore) {
          bestScore = s
          best = b
        }
      }
      let bestE: { key: string } | null = null
      let bestEScore = 0
      for (const e of extras) {
        const s = [...qk].filter((k) => e.keys.has(k)).length
        if (s > bestEScore) {
          bestEScore = s
          bestE = e
        }
      }
      out.push({
        id: String(q.id),
        subdomain: String(q.subdomain),
        ...(best && bestScore >= 2
          ? { bullet: best.id, bulletScore: bestScore }
          : {}),
        ...(bestE && bestEScore >= 2
          ? { extra: bestE.key, extraScore: bestEScore }
          : {}),
      })
    }
  }
  console.log(JSON.stringify(out, null, 1))
}

// Aplica mapeamento revisado por humano: [{id, sourceUrl}] — SOMENTE stamp
// (source=mslearn + updatedAt). Reescritas (T2/T3) continuam manuais via Edit.
// Faz backup .bak de cada arquivo tocado (LESSONS 2026-09-12). Valida cada URL
// contra o mapa (bullets + topicExtras); URL fora do mapa = erro e nada aplica.
// Uso: npx tsx scripts/grounding-map.mts --apply .agent/retrofit/ig-batch-1.json
function applyMappingFile(mappingPath: string) {
  const map = loadMap()
  const allowed = new Set<string>()
  for (const b of Object.values(map.bullets)) {
    if (b.url) allowed.add(b.url)
    for (const u of b.extraUrls ?? []) allowed.add(u)
  }
  for (const e of Object.values(map.topicExtras ?? {})) {
    if (e.url) allowed.add(e.url)
  }
  const mapping = JSON.parse(readFileSync(mappingPath, 'utf8')) as {
    id: string
    sourceUrl: string
  }[]
  for (const m of mapping) {
    if (!allowed.has(m.sourceUrl)) {
      console.error(`URL fora do mapa: ${m.id} → ${m.sourceUrl}`)
      process.exit(1)
    }
  }
  const byFile = new Map<string, { id: string; sourceUrl: string }[]>()
  const files = readdirSync(DATA).filter(
    (f) => f.endsWith('.json') && !SKIP.has(f),
  )
  const idToFile = new Map<string, string>()
  for (const f of files) {
    const arr = read(f)
    if (!Array.isArray(arr)) continue
    for (const q of arr as { id?: string }[]) {
      if (typeof q?.id === 'string') idToFile.set(q.id, f)
    }
  }
  for (const m of mapping) {
    const f = idToFile.get(m.id)
    if (!f) {
      console.error(`ID não encontrado: ${m.id}`)
      process.exit(1)
    }
    const l = byFile.get(f) ?? []
    l.push(m)
    byFile.set(f, l)
  }
  const now = new Date().toISOString()
  for (const [f, ms] of byFile) {
    const url = new URL(f, DATA)
    const raw = readFileSync(url, 'utf8')
    writeFileSync(`${url.pathname}.bak`, raw)
    const arr = JSON.parse(raw) as Record<string, unknown>[]
    const rows = new Map(ms.map((m) => [m.id, m.sourceUrl]))
    for (const q of arr) {
      const u = rows.get((q as { id: string }).id)
      if (u) {
        ;(q as Record<string, unknown>).source = 'mslearn'
        ;(q as Record<string, unknown>).sourceUrl = u
        ;(q as Record<string, unknown>).updatedAt = now
      }
    }
    writeFileSync(url, `${JSON.stringify(arr, null, 2)}\n`)
    console.log(`${f}: ${ms.length} carimbadas (backup .bak)`)
  }
}

const args = new Set(process.argv.slice(2))
const argv = process.argv.slice(2)
if (args.has('--init')) init()
else if (args.has('--propose')) {
  const di = argv.indexOf('--domain')
  const domain = di >= 0 ? argv[di + 1] : ''
  if (!domain) {
    console.error('Uso: --propose --domain <dominio>')
    process.exit(1)
  }
  proposeQuestions(domain)
} else if (args.has('--apply')) {
  const ai = argv.indexOf('--apply')
  const mappingPath = ai >= 0 ? argv[ai + 1] : ''
  if (!mappingPath) {
    console.error('Uso: --apply <mapping.json>')
    process.exit(1)
  }
  applyMappingFile(mappingPath)
} else inventory()
