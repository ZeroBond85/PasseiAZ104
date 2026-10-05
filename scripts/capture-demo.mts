// Captura o vídeo demo do quiz para o GIF da Track C (C-5).
// Roda contra o preview de produção (mesmo setup do playwright.config.ts):
//   npm run build
//   npm run preview -- --port 4173 --strictPort --host 127.0.0.1 &
//   npx tsx scripts/capture-demo.mts
// Fluxo (igual ao e2e quiz.spec.ts): ?local=1 → Simulado → Começar →
// responde Q1 → Questão 2 → responde → Finalizar → confirma → stats.
// Nenhum dado real de usuário (?local=1 = modo local). O webm sai no
// diretório temporário do SO; a montagem do GIF é com ffmpeg (ver docs).
// Artefato versionado; NÃO roda no CI.
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 800, height: 600 },
  recordVideo: {
    dir: join(tmpdir(), 'passei-demo'),
    size: { width: 800, height: 600 },
  },
})
const page = await ctx.newPage()
page.on('dialog', (d) => void d.accept())

await page.goto('http://127.0.0.1:4173/PasseiAZ104/?local=1')
await page.getByRole('button', { name: 'Simulado', exact: true }).click()
await page.getByRole('button', { name: 'Começar simulado' }).click()
// primeiro load semeia o banco (1000 questões) no IDB — pode passar de 15 s
await page.locator('question-card h2').waitFor({ timeout: 45000 })

await page.keyboard.press('1')
await page.waitForTimeout(700)
await page.getByRole('button', { name: /Questão 2,/ }).click()
await page.keyboard.press('2')
await page.waitForTimeout(700)

await page.getByRole('button', { name: /Finalizar/ }).click()
await page
  .getByRole('dialog', { name: 'Finalizar simulado?' })
  .getByRole('button', { name: 'Finalizar' })
  .click()
await page.locator('stats-dashboard h2').waitFor({ timeout: 10000 })
await page.waitForTimeout(1500)

const video = await page.video()?.path()
console.log(`VIDEO=${video}`)
await ctx.close()
await browser.close()
