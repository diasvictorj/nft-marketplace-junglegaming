import { nfts, users } from '../e2e/fixtures/data'
import { expect, test } from '../e2e/support/fixtures'

/**
 * Regressão visual: início, detalhe, carrinho e pagamento (baselines versionadas em
 * tests/visual/__baselines__/<projeto>/). Dados estáveis do seed; painel de mocks e
 * toasts ocultos; animações desligadas.
 */
const STABILIZE = `
  [data-testid="mock-panel"], [data-sonner-toaster] { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
`

async function settle(page: import('@playwright/test').Page) {
  await page.addStyleTag({ content: STABILIZE })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  // Garante que todas as imagens (inclusive lazy) carregaram.
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) img.loading = 'eager'
    await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : new Promise((r) => (img.onload = img.onerror = r)))))
  })
}

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')).toHaveCount(9)
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('detalhe do NFT', async ({ page }) => {
    await page.goto(`/nfts/${nfts.emerald.id}`)
    await expect(page.getByRole('heading', { level: 1, name: nfts.emerald.title })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true })
  })

  test('carrinho', async ({ app, page }) => {
    await app.addToCart(nfts.emerald.id, 2, false)
    await app.addToCart(nfts.neon.id)
    await expect(page.locator('dl').filter({ hasText: 'Subtotal' })).toContainText('4.386 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('pagamento', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await expect(page.locator('dl').filter({ hasText: 'Subtotal' })).toContainText('1.206 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
