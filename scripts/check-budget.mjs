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
  let total = 0
  let raw = 0
  for (const f of files) {
    const buf = readFileSync(new URL(f, dir))
    const gz = gzipSync(buf).length
    total += gz
    raw += statSync(new URL(f, dir)).size
    console.log(
      `  budget ${label} ${f}: gzip ${(gz / 1024).toFixed(1)}KB (raw ${(buf.length / 1024).toFixed(0)}KB)`,
    )
  }
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
