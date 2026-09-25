import { expect, test } from '@playwright/test'

// Regressão: logo 1008px estourava o viewport mobile (docScroll 1029 > 390)
// porque app-shell renderizava em light DOM e seus `static styles` nunca
// eram aplicados (LESSONS 2026-09-25). Trava scrollWidth <= 390 em 390px.
test('overflow: home e quiz sem scroll horizontal em 390px', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Escolher um simulado' }).waitFor()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)

  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await page.locator('question-card h2').waitFor({ timeout: 15000 })
  await page.keyboard.press('1')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  expect(errors).toEqual([])
})
