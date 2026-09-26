// Sincroniza a contagem de testes no README (Sprint 5, PLAN-3).
// Uso: node scripts/update-readme-test-count.mjs [--check]
// --check: exit 1 se divergir, sem escrever (gate no `ci`).
// Conta: vitest (unit+integração, via reporter JSON) + playwright --list (e2e).
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const ROOT = new URL('../', import.meta.url)
const README = new URL('../README.md', import.meta.url)

function unitCount() {
  const out = execSync(
    'npx vitest run --reporter=json --outputFile=/tmp/vitest-count.json',
    {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  void out
  const r = JSON.parse(readFileSync('/tmp/vitest-count.json', 'utf8'))
  if (typeof r.numTotalTests !== 'number')
    throw new Error('vitest JSON sem numTotalTests')
  return r.numTotalTests
}

function e2eCount() {
  const out = execSync('npx playwright test --list', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const m = out.match(/Total:\s+(\d+)\s+tests?/)
  if (!m) throw new Error('playwright --list sem linha Total')
  return Number(m[1])
}

const unit = unitCount()
const e2e = e2eCount()
let readme = readFileSync(README, 'utf8')

const ciLine = readme.match(/^.*`tsc` \+ .*$/m)?.[0]
if (!ciLine) throw new Error('linha de qualidade do README não encontrada')
const ciNew = ciLine.replace(
  /\+\s*`tsc`\s*\+\s*\d+\s*testes(\s*unit)?/,
  `+ \`tsc\` + ${unit} testes unit`,
)

const e2eLine = readme.match(/^- e2e.*$/m)?.[0]
if (!e2eLine) throw new Error('linha e2e do README não encontrada')
const e2eNew = e2eLine
  .replace(/\s*\(\d+\s*(specs|e2e)\)/, '')
  .replace(/^(- e2e)(:)?/, `$1 (${e2e} specs)$2`)

if (process.argv.includes('--check')) {
  const dirty = ciLine !== ciNew || e2eLine !== e2eNew
  if (dirty) {
    console.error(
      'README desatualizado. Rode: node scripts/update-readme-test-count.mjs',
    )
    console.error(`unit: ${unit} · e2e: ${e2e}`)
    process.exit(1)
  }
  console.log(`README ok: ${unit} unit + ${e2e} e2e`)
} else {
  readme = readme.replace(ciLine, ciNew).replace(e2eLine, e2eNew)
  writeFileSync(README, readme)
  console.log(`README atualizado: ${unit} unit + ${e2e} e2e`)
}
