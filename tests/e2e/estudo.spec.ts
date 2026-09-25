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
  expect(errors).toEqual([])
})

// Hub com dados: joga 1 questão (errando) via fluxo real e finaliza —
// depois a aba Estudo mostra domínios fracos + links MS Learn.
test('estudo: hub mostra fracos + links após attempt', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (d) => void d.accept())

  // Semeia o IDB pelo fluxo real (quiz) e captura o id da Q1
  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  const qid = await page
    .locator('question-card .qid')
    .first()
    .innerText()
    .then((t) => t.split('·')[0].trim())
  // Responde (qualquer) e finaliza para gravar o attempt
  await page.keyboard.press('1')
  await page.getByRole('button', { name: /Finalizar/ }).click()
  await page
    .getByRole('dialog', { name: 'Finalizar simulado?' })
    .getByRole('button', { name: 'Finalizar' })
    .click()
  await expect(page.locator('stats-dashboard h2')).toBeVisible({
    timeout: 10000,
  })

  // Marca a resposta como errada direto no attempt (determinístico)
  await page.evaluate(async (id: string) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('passei-az104')
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('attempts', 'readwrite')
        const store = tx.objectStore('attempts')
        const get = store.getAll()
        get.onsuccess = () => {
          for (const a of get.result as {
            id: string
            answers: { questionId: string; correct: boolean }[]
          }[]) {
            const an = a.answers.find((x) => x.questionId === id)
            if (an) {
              an.correct = false
              store.put(a)
            }
          }
          resolve()
        }
        get.onerror = () => reject(get.error)
      }
      open.onerror = () => reject(open.error)
    })
  }, qid)

  await page.getByRole('button', { name: 'Estudo', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'O que estudar agora' }),
  ).toBeVisible({ timeout: 10000 })
  expect(await page.locator('study-link-card').count()).toBeGreaterThan(0)
  expect(errors).toEqual([])
})
