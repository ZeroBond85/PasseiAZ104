// new-question.mts — guia interativo p/ nova questão (Sprint 5, PLAN-3).
// Monta o JSON no schema, valida (Zod + FK caseStudyId) e imprime o bloco
// pronto p/ colar + checklist QUESTION-GUIDELINES. Não escreve em data/.
// Uso: npx tsx scripts/new-question.mts

import { readFileSync } from 'node:fs'
import { stdin as input, stdout as output } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { validateQuestion } from '../src/engine/question-schema.js'

const DATA = new URL('../data/', import.meta.url)
const DOMAINS = [
  {
    id: 'identidade-governanca',
    code: 'ig',
    files: ['identidade-governanca.json', 'identidade-acesso.json'],
  },
  { id: 'storage', code: 'st', files: ['storage.json'] },
  {
    id: 'compute',
    code: 'co',
    files: ['compute-vms.json', 'compute-apps.json', 'compute-platform.json'],
  },
  { id: 'rede-virtual', code: 'rv', files: ['rede-virtual.json'] },
  { id: 'monitoramento', code: 'mo', files: ['monitoramento.json'] },
] as const
const TYPES = ['single', 'multiple', 'case-study', 'yes-no'] as const
const DIFFS = ['easy', 'medium', 'hard'] as const
const SOURCES = ['original', 'mslearn', 'community', 'ai-generated'] as const

const rl = process.stdin.isTTY ? createInterface({ input, output }) : null
// Modo lote (stdin sem TTY: testes, CI): lê todas as linhas de uma vez.
// Modo interativo (TTY): pergunta uma a uma.
const batchLines: string[] | null = rl
  ? null
  : readFileSync(0, 'utf8').split('\n')
let batchIdx = 0
const ask = async (q: string, dflt = ''): Promise<string> => {
  if (batchLines) {
    const a = (batchLines[batchIdx++] ?? '').trim()
    console.log(`${q} ${a}`)
    return a || dflt
  }
  if (!rl) throw new Error('readline indisponível (stdin sem TTY e sem lote)')
  const a = (await rl.question(dflt ? `${q} [${dflt}] ` : `${q} `)).trim()
  return a || dflt
}
const pick = async (
  label: string,
  opts: readonly string[],
): Promise<string> => {
  console.log(`\n${label}`)
  opts.forEach((o, i) => {
    console.log(`  ${i + 1}) ${o}`)
  })
  for (;;) {
    const a = await ask(`Escolha 1-${opts.length}:`)
    const n = Number(a)
    if (Number.isInteger(n) && n >= 1 && n <= opts.length) return opts[n - 1]
    console.log('Opção inválida.')
  }
}

async function main(): Promise<void> {
  try {
    console.log('Nova questão AZ-104 — responda; Enter aceita o default.\n')
    const domain = await pick(
      'Domínio:',
      DOMAINS.map((d) => d.id),
    )
    const dinfo = DOMAINS.find((d) => d.id === domain)
    if (!dinfo) throw new Error(`domínio inválido: ${domain}`)
    const files = [...dinfo.files]
    const targetFile =
      files.length > 1 ? await pick('Arquivo destino:', files) : files[0]
    const arr = JSON.parse(readFileSync(new URL(targetFile, DATA), 'utf8')) as {
      id: string
    }[]
    let max = 0
    for (const q of arr) {
      const m = q.id.match(new RegExp(`^az104-${dinfo.code}-(\\d+)$`))
      if (m) max = Math.max(max, Number(m[1]))
    }
    const suggestId = `az104-${dinfo.code}-${String(max + 1).padStart(3, '0')}`
    const id = await ask('ID:', suggestId)
    const subdomain = await ask('Subdomínio (ex.: vms-tamanhos):')
    const type = await pick('Tipo:', TYPES)
    const difficulty = await pick('Dificuldade:', DIFFS)
    const question = await ask('Enunciado (≥50 chars):')
    const nOpts = Math.min(
      6,
      Math.max(
        2,
        Number(
          await ask('Nº alternativas (2-6):', type === 'yes-no' ? '2' : '4'),
        ) || 4,
      ),
    )
    const letters = 'ABCDEF'.slice(0, nOpts).split('')
    const options = []
    for (const l of letters) {
      const text = await ask(`Alternativa ${l}:`)
      options.push({ letter: l, text })
    }
    const correct = (
      await ask(
        `Corretas (letras separadas por vírgula):`,
        type === 'single' || type === 'yes-no' ? 'A' : 'A,B',
      )
    )
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
    const explanation = await ask(
      'Explicação (≥100 chars, porquê de cada erro):',
    )
    const source = await pick('Origem:', SOURCES)
    const sourceUrl =
      source === 'mslearn' || source === 'community'
        ? await ask('sourceUrl (obrigatório p/ mslearn/community):')
        : ''
    let caseStudyId = ''
    if (type === 'case-study') {
      const cases = JSON.parse(
        readFileSync(new URL('case-studies.json', DATA), 'utf8'),
      ) as { id: string }[]
      caseStudyId = await pick(
        'caseStudyId:',
        cases.map((c) => c.id),
      )
    }
    const now = new Date().toISOString()
    const q: Record<string, unknown> = {
      id,
      domain,
      subdomain,
      type,
      difficulty,
      question,
      options,
      correct,
      explanation,
      source,
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(caseStudyId ? { caseStudyId } : {}),
      needsReview: true,
      createdAt: now,
      updatedAt: now,
      version: 1,
    }

    const r = validateQuestion(q)
    if (!r.success) {
      console.error('\nSCHEMA REJEITOU:')
      for (const i of r.error.issues) {
        const path = i.path.join('.') || '(root)'
        console.error(`- ${path}: ${i.message}`)
      }
      process.exit(1)
    }
    console.log('\nVALIDADO ✓ — bloco pronto (needsReview:true, quarentena):\n')
    console.log(JSON.stringify(q, null, 2))
    console.log(`\nCole em data/${targetFile} (array, ordem crescente de id).`)
    console.log(
      'Checklist QUESTION-GUIDELINES: cenário realista · 4 plausíveis ·',
    )
    console.log(
      'explanation com porquê de cada erro · grounded MS Learn · validate limpo.',
    )
    console.log(
      'Depois: npm run validate && npm run test:count (se mudar totais).',
    )
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('\nInterrompido pelo usuário.')
      process.exit(130)
    }
    throw err
  } finally {
    rl?.close()
  }
}

void main()
