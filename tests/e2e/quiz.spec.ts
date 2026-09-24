import { expect, test } from '@playwright/test'

// Gate 0A: quiz fim-a-fim no browser — responder, flag, navegar, finalizar, review + stats.
test('quiz: responde, flag, finaliza, revisa', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => void d.accept())

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Começar simulado' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  // Responde Q1 (teclado 1) e marca revisão
  await page.keyboard.press('1')
  await page.getByRole('button', { name: /Marcar revisão/ }).click()
  // Navega para Q2 pelo navigator e responde
  await page.getByRole('button', { name: /Questão 2,/ }).click()
  await page.keyboard.press('2')

  // Timer visível e contando
  await expect(page.locator('timer-bar strong')).toBeVisible()

  // Finaliza (há 48 sem responder → dialog aceito acima)
  await page.getByRole('button', { name: /Finalizar/ }).click()
  // Confirmar no modal customizado (dialog acessível via role)
  await page
    .getByRole('dialog', { name: 'Finalizar simulado?' })
    .getByRole('button', { name: 'Finalizar' })
    .click()
  await expect(page.locator('stats-dashboard h2')).toBeVisible({
    timeout: 10000,
  })
  await expect(page.locator('review-card')).toHaveCount(50)
  expect(errors).toEqual([])
})
