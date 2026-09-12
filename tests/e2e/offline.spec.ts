import { expect, test } from '@playwright/test'

// Gate 0A item 9: kill server — após 1ª carga (seed IDB), offline recarrega do IDB.
test('offline: recarrega questões do IDB sem rede', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  // IDB seedado na 1ª carga → questões voltam sem rede
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  expect(errors).toEqual([])
})
