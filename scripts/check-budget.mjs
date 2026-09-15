// Guarda de orçamento de bundle (determinístico, sem rede).
// Falha (exit 1) se o gzip do JS/CSS de dist/ ultrapassar os tetos.
// Rodar após `npm run build`. Tetos calibrados em 2026-09-15:
// JS principal ~96KB gzip → teto 140KB · CSS ~2KB → teto 10KB.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGETS = [
  { ext: '.js', gzipMax: 140 * 1024, label: 'JS' },
  { ext: '.css', gzipMax: 10 * 1024, label: 'CSS' },
]

const dir = new URL('../dist/assets/', import.meta.url)
let failed = false
for (const { ext, gzipMax, label } of BUDGETS) {
  const files = readdirSync(dir).filter((f) => f.endsWith(ext))
  const total = files.reduce(
    (n, f) => n + gzipSync(readFileSync(new URL(f, dir))).length,
    0,
  )
  const raw = files.reduce((n, f) => n + statSync(new URL(f, dir)).size, 0)
  const ok = total <= gzipMax
  if (!ok) failed = true
  console.log(
    `budget ${label}: gzip ${(total / 1024).toFixed(1)}KB / teto ${(gzipMax / 1024).toFixed(0)}KB (raw ${(raw / 1024).toFixed(0)}KB, ${files.length} arq.) → ${ok ? 'OK' : 'ESTOUROU'}`,
  )
}
if (failed) {
  console.error('FATAL: bundle estourou o orçamento')
  process.exit(1)
}
