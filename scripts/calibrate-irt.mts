// calibrate-irt.mts — estima parâmetros IRT 1PL por questão e grava data/irt-params.json.
// Entrada: CSV do painel Admin (questionId,domain,attempts,pct,...) OU JSON [{questionId,correct,total}].
// Uso: node scripts/calibrate-irt.mts --csv /tmp/analytics.csv
//      node scripts/calibrate-irt.mts --json /tmp/agg.json
// Saída: data/irt-params.json {questionId: {p, b, n}} (só n>=30; resto é ruído e fica fora).
import { readFileSync, writeFileSync } from 'node:fs'
import { estimateItem } from '../src/engine/irt.ts'

interface Row {
  questionId: string
  correct: number
  total: number
}

function fromCsv(text: string): Row[] {
  const lines = text.trim().split('\n')
  const head = (lines.shift() ?? '')
    .split(',')
    .map((s) => s.replaceAll('"', '').trim())
  const qi = head.indexOf('questionId')
  const ai = head.indexOf('attempts')
  const pi = head.indexOf('pct')
  if (qi < 0 || ai < 0 || pi < 0)
    throw new Error(
      'CSV precisa das colunas questionId,attempts,pct (export do Admin)',
    )
  return lines.map((l) => {
    const c = l.split(',').map((s) => s.replaceAll('"', '').trim())
    const total = Number(c[ai] ?? 0)
    const correct = Math.round((total * Number(c[pi] ?? 0)) / 100)
    return { questionId: c[qi] ?? '', correct, total }
  })
}

function main() {
  const args = process.argv.slice(2)
  const csvIdx = args.indexOf('--csv')
  const jsonIdx = args.indexOf('--json')
  let rows: Row[]
  if (csvIdx >= 0 && args[csvIdx + 1]) {
    rows = fromCsv(readFileSync(args[csvIdx + 1], 'utf8'))
  } else if (jsonIdx >= 0 && args[jsonIdx + 1]) {
    rows = JSON.parse(readFileSync(args[jsonIdx + 1], 'utf8')) as Row[]
  } else {
    console.error('Uso: calibrate-irt.mts --csv <arquivo> | --json <arquivo>')
    process.exit(1)
  }
  const out: Record<string, { p: number; b: number; n: number }> = {}
  let skipped = 0
  for (const r of rows) {
    if (!r.questionId) continue
    const p = estimateItem(r.correct, r.total, r.questionId)
    if (!p) {
      skipped++
      continue
    }
    out[r.questionId] = { p: p.p, b: p.b, n: p.n }
  }
  writeFileSync(
    new URL('../data/irt-params.json', import.meta.url),
    JSON.stringify(out, null, 2) + '\n',
  )
  console.log(
    `irt: ${Object.keys(out).length} questões calibradas, ${skipped} sem amostra (n<30)`,
  )
}

main()
