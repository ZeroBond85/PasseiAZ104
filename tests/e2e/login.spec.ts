import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// L3: com sync habilitado (build com env), sem sessão → tela de login.
// Sem env (ex.: PR de fork): skip — o gate não existe nesse ambiente.
// Cobre também axe da tela de login (home/quiz estão em axe.spec.ts).
test('login: gate aparece e valida e-mail', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./')
  await page.locator('app-shell').waitFor({ timeout: 15000 })
  if ((await page.locator('login-screen').count()) === 0) {
    test.skip(true, 'sync desativado neste ambiente (sem Supabase)')
  }
  await expect(page.locator('login-screen h1')).toBeVisible({ timeout: 15000 })
  await expect(page.locator('login-screen .logo')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])

  await page.locator('login-screen input[type="email"]').fill('nao-email')
  await page.getByRole('button', { name: /Entrar com link/ }).click()
  await expect(page.locator('login-screen [role="alert"]')).toContainText(
    'válido',
  )
  expect(errors).toEqual([])
})
