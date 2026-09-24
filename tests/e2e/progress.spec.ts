import { expect, test } from '@playwright/test'

// v7.0 Q: finalizar simulado grava attempt no IDB → aba Progresso reflete
// (simulados, streak, resumo de notas) e o review ganha tags de erro →
// dúvida entra no Progresso.
test('progresso: attempt vira stats + diamond de estudo guiado + dúvida', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => void d.accept())

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  // Responde a 1ª e erra de propósito (opção B numa de única escolha)
  await page.keyboard.press('2')
  // Finaliza (49 sem responder → dialog aceito)
  await page.getByRole('button', { name: /Finalizar/ }).click()
  // Confirmar no modal customizado (dialog acessível via role)
  await page
    .getByRole('dialog', { name: 'Finalizar simulado?' })
    .getByRole('button', { name: 'Finalizar' })
    .click()
  await expect(page.locator('stats-dashboard h2')).toBeVisible({
    timeout: 10000,
  })

  // Estudo guiado aparece na revisão
  await expect(
    page.getByText('O que estudar a partir deste simulado'),
  ).toBeVisible({ timeout: 5000 })

  // Marca a causa do erro na 1ª questão errada
  const cards = page.locator('review-card')
  const miss = cards.filter({ has: page.locator('.miss') }).first()
  await miss.getByRole('button', { name: 'Falta de conceito' }).click()
  await expect(
    miss.getByRole('button', { name: 'Falta de conceito' }),
  ).toHaveAttribute('aria-pressed', 'true')

  // Aba Progresso reflete o attempt + dúvida anotada
  await page.getByRole('button', { name: 'Progresso', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Seu progresso', level: 2 }),
  ).toBeVisible()
  await expect(page.getByText('1', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Suas dúvidas')).toBeVisible()
  expect(errors).toEqual([])
})

// v7.0 Q: sem isAdmin a aba Admin não aparece na navegação.
test('admin: aba só para role admin (sem role → sem aba)', async ({ page }) => {
  await page.goto('./?local=1')
  await expect(
    page.getByRole('button', { name: 'Início', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Admin', exact: true }),
  ).toHaveCount(0)
})
