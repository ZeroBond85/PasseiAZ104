import { expect, test } from '@playwright/test'

// Gate 0A item 9: kill server — após 1ª carga (seed IDB), offline recarrega do IDB.
test('offline: recarrega questões do IDB sem rede', async ({
  page,
  context,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Começar simulado' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Começar simulado' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  // IDB seedado na 1ª carga → questões voltam sem rede
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  expect(errors).toEqual([])
})

// Sprint 2 (PLAN-3): banco volta do cache do SW quando data/*.json falha na rede.
// Prova o runtimeCaching StaleWhileRevalidate: IDB apagado + rede abortada p/ data
// → seed precisa vir do SW (não do fetch, não do IDB).
test('offline: seed volta do cache do SW sem rede nos data/*.json', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  // 1ª carga online (semeia IDB + popula o runtime cache do SW)
  await page.goto('./?local=1')
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  // 2º load: garante que o SW assumiu o controle da página
  await page.reload()
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })

  // Limpa o store de questões + versão do seed (IDB segue aberto, sem delete)
  // e bloqueia a rede só p/ data/*.json
  await page.evaluate(async () => {
    localStorage.removeItem('az104-seed-version')
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('passei-az104')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    try {
      const tx = db.transaction('questions', 'readwrite')
      await new Promise<void>((resolve, reject) => {
        const clear = tx.objectStore('questions').clear()
        clear.onsuccess = () => resolve()
        clear.onerror = () => reject(clear.error)
      })
    } finally {
      db.close()
    }
  })
  await page.route('**/data/*.json', (route) => route.abort())

  // Reload: seed falha no IDB (limpo) e no fetch (abortado) → SW serve do cache
  await page.reload()
  await page.getByRole('button', { name: 'Simulado', exact: true }).click()
  await page.getByRole('button', { name: 'Começar simulado' }).click()
  await expect(page.locator('question-card h2')).toBeVisible({ timeout: 15000 })
  expect(errors).toEqual([])
})
