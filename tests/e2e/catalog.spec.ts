import { expect, test } from '@playwright/test'

// A1: catálogo de simulados — 10 oficiais + Simulado Dinâmico, e o dinâmico
// agora distribui pelos 5 domínios (fim do bug do monodomínio).
test('catalogo: lista oficiais e dinamico; dinamico cobre 5 dominios', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => void d.accept())

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Escolher um simulado' }).click()
  for (let i = 1; i <= 10; i++) {
    await expect(
      page.getByRole('button', {
        name: `Simulado Oficial ${i} 50 questões · 100 min`,
      }),
    ).toBeVisible()
  }
  await expect(
    page.getByRole('button', { name: /^Simulado Dinâmico/ }),
  ).toBeVisible()

  // Dinâmico: inicia e verifica distribuição nos 5 domínios do enunciado
  await page.getByRole('button', { name: /^Simulado Dinâmico/ }).click()
  await expect(
    page.getByRole('button', { name: 'Começar simulado' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  // Amostra as 50 questões e confere que têm os 5 domínios do IDB
  const domains = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const qid = await page.locator('question-card .qid').first().innerText()
    const code = qid.split('·')[0].trim().split('-')[1].toLowerCase()
    domains.add(code)
    if (i < 49) await page.keyboard.press('ArrowRight')
  }
  expect([...domains].sort()).toEqual(['co', 'ig', 'mo', 'rv', 'st'])
  expect(errors).toEqual([])
})

// A1: oficial fixo = 50 questões na ordem do simulados.json
test('catalogo: oficial-01 carrega 50 questoes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Escolher um simulado' }).click()
  await page
    .getByRole('button', { name: 'Simulado Oficial 1 50 questões · 100 min' })
    .click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.progress')).toContainText('Questão 1 de 50')
  expect(errors).toEqual([])
})
