import { expect, test } from '@playwright/test'

// L3: com sync habilitado (build local tem .env), sem sessão → tela de login.
// Sem ?local=1: gate aparece. Validação de e-mail inválido não dispara rede.
test('login: gate aparece e valida e-mail', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./')
  await expect(page.locator('login-screen h1')).toBeVisible({ timeout: 15000 })
  await expect(
    page.locator('login-screen img[alt="Passei AZ-104"]'),
  ).toBeVisible()

  await page.locator('login-screen input[type="email"]').fill('nao-email')
  await page.getByRole('button', { name: /Entrar com link/ }).click()
  await expect(page.locator('login-screen [role="alert"]')).toContainText(
    'válido',
  )
  expect(errors).toEqual([])
})
