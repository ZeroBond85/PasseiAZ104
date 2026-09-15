// Valida o relatório JSON do Lighthouse contra lighthouse-budget.json.
// Compara TRANSFERÊNCIA (bytes na rede, com gzip) por tipo de recurso.
// Uso (CI): lighthouse ... --output=json --output-path=/tmp/lh.json && node scripts/check-lh.mjs /tmp/lh.json
// Escores NÃO são validados aqui (flutuam no runner); baseline manual em LOG.md.
import { readFileSync } from 'node:fs'

const reportPath = process.argv[2]
if (!reportPath) {
  console.error('uso: node scripts/check-lh.mjs <relatorio.json>')
  process.exit(1)
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const budget = JSON.parse(
  readFileSync(new URL('../lighthouse-budget.json', import.meta.url), 'utf8'),
)
const items = report.audits?.['resource-summary']?.details?.items ?? []
const byType = new Map(items.map((i) => [i.resourceType, i.transferSize ?? 0]))

let failed = false
for (const [type, max] of Object.entries(budget)) {
  const got =
    type === 'total'
      ? [...byType.values()].reduce((a, b) => a + b, 0)
      : (byType.get(type) ?? 0)
  const ok = got <= max
  if (!ok) failed = true
  console.log(
    `lh ${type}: ${(got / 1024).toFixed(1)}KB / teto ${(max / 1024).toFixed(0)}KB → ${ok ? 'OK' : 'ESTOUROU'}`,
  )
}
if (failed) {
  console.error('FATAL: Lighthouse estourou o orçamento de transferência')
  process.exit(1)
}
