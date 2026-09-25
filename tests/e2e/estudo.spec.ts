import { expect, test } from '@playwright/test'

// RPR (LESSONS 2026-09-25): renderEstudo() era `async` e retornava Promise —
// o Lit renderizava nada e a aba Estudo ficava em branco, sem nenhum e2e pegar.
// Agora é render síncrono sobre estado + loadEstudo() no select().
test('estudo: aba renderiza guia oficial e estado vazio', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Estudo', exact: true }).click()
  // Card do guia oficial da Microsoft sempre visível
  await expect(
    page.getByRole('heading', { name: 'Guia oficial da Microsoft' }),
  ).toBeVisible()
  // Perfil zerado: estado vazio com ação (nunca tela em branco)
  await expect(page.getByText('Nada para revisar agora.')).toBeVisible()
  // app-shell é shadow DOM: innerText do host/body não inclui o shadow —
  // mede num elemento interno (mesmo padrão de question-card .qid)
  const text = await page.locator('main').first().innerText()
  expect(text.length).toBeGreaterThan(20)
  expect(errors).toEqual([])
})
