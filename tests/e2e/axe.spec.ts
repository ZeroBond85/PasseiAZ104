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
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
