// check-exam-outline.mjs — detecta atualização do outline oficial (Sprint 5).
// Busca a página do guia de estudo, extrai "Habilidades medidas a partir de
// <data>" e compara com exam-syllabus.json (skillsOutlineDate).
// Saída stdout: linhas KEY=valor (OUTLINE_CHANGED, DETECTED_DATE, SNAPSHOT_DATE).
// - fetch/parse falhou → OUTLINE_CHANGED=unknown (só relatório, sem issue).
// - data diferente → OUTLINE_CHANGED=true (workflow abre issue + gap report).
import { readFileSync } from 'node:fs'

const GUIDE_URL =
  'https://learn.microsoft.com/pt-br/credentials/certifications/resources/study-guides/az-104'
const MONTHS = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  março: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
}
const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

async function main() {
  const syllabus = JSON.parse(
    readFileSync(
      new URL('../data/exam-syllabus.json', import.meta.url),
      'utf8',
    ),
  )
  console.log(`SNAPSHOT_DATE=${syllabus.skillsOutlineDate ?? ''}`)
  let html = ''
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)
    const res = await fetch(GUIDE_URL, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'PasseiAZ104-outline-watch/1.0' },
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    console.log(`OUTLINE_CHANGED=unknown`)
    console.log(`ERROR=${err instanceof Error ? err.message : err}`)
    return
  }
  const m = norm(html).match(
    /habilidades medidas a partir de (\d{1,2}) de ([a-z]+) de (\d{4})/,
  )
  if (!m) {
    console.log(`OUTLINE_CHANGED=unknown`)
    console.log(`ERROR=padrão de data não encontrado na página`)
    return
  }
  const iso = `${m[3]}-${MONTHS[m[2]] ?? '??'}-${m[1].padStart(2, '0')}`
  console.log(`DETECTED_DATE=${iso}`)
  console.log(
    `OUTLINE_CHANGED=${iso !== syllabus.skillsOutlineDate ? 'true' : 'false'}`,
  )
}

main().catch((err) => {
  console.log(`OUTLINE_CHANGED=unknown`)
  console.log(`ERROR=${err instanceof Error ? err.message : err}`)
})
