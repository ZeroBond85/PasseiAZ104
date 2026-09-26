import { expect, test } from '@playwright/test'

// Treino fim-a-fim: escolhe domínio, responde, finaliza no modal info (sem alert nativo).
test('treino: responde, finaliza no modal, volta à grade', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  let nativeDialogs = 0
  page.on('dialog', () => {
    nativeDialogs++
  })

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Treino', exact: true }).click()
  await page.getByRole('button', { name: /Computação/ }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  // Responde Q1 clicando na primeira alternativa (radio ou checkbox)
  await page.locator('[role="radio"], [role="checkbox"]').first().click()

  await page.getByRole('button', { name: 'Finalizar', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Treino concluído' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/Treino concluído: \d+\/\d+ \(\d+%\)/)
  await dialog.getByRole('button', { name: 'OK' }).click()

  // Volta à grade de domínios, sem dialog nativo (alert extinto)
  await expect(
    page.getByRole('heading', { name: 'Treino por domínio' }),
  ).toBeVisible()
  expect(nativeDialogs).toBe(0)
  expect(errors).toEqual([])
})
