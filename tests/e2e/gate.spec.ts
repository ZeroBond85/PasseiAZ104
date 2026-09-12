import { expect, test } from '@playwright/test'

// Gate 0A: tema persiste + timer 100min + score numérico + flag visível.
test('tema persiste, timer 100min, score e flag', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => void d.accept())

  await page.goto('./')
  // Tema: alterna para light, recarrega, continua light
  await page.getByRole('button', { name: /Alternar para tema/ }).click()
  await expect(page.locator('html[data-theme="light"]')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('html[data-theme="light"]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  // Timer 100min conta de 100:00
  await expect(page.locator('timer-bar strong')).toContainText('100:', {
    timeout: 5000,
  })

  // Flag aparece no navigator (shadow DOM: localizar por role, não por CSS)
  await page.getByRole('button', { name: /Marcar revisão/ }).click()
  await expect(page.getByRole('button', { name: /marcada/ })).toHaveCount(1)

  await page.getByRole('button', { name: /Finalizar/ }).click()
  await expect(page.locator('stats-dashboard h2')).toContainText('/ 1000')
  expect(errors).toEqual([])
})
