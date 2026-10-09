import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// S15: zero violações axe em home + quiz (bypass ?local=1: sem sessão, sem gate).
test('axe: home sem violações', async ({ page }) => {
  await page.goto('./?local=1')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('axe: quiz sem violações', async ({ page }) => {
  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Começar simulado' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /Finalizar/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Finalizar simulado?' })
  await expect(dialog).toBeVisible()
  const axeResults = await new AxeBuilder({ page }).analyze()
  expect(axeResults.violations).toEqual([])

  const cancel = dialog.getByRole('button', { name: 'Voltar' })
  const confirm = dialog.getByRole('button', { name: 'Finalizar' })
  await cancel.focus()
  await page.keyboard.press('Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('axe: progresso sem violações', async ({ page }) => {
  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Progresso', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Seu progresso', level: 1 }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
