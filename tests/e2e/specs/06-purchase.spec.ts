import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('6. Compra completa', () => {
  test('do catálogo ao recibo confirmado', async ({ app, page }) => {
    await page.getByRole('link', { name: nfts.emerald.title }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: nfts.emerald.title })).toBeVisible()
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await page.waitForURL('**/cart')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await app.fillLogin(users.ana)
    await expect(page).toHaveURL(/\/checkout/)

    // Validação dos campos do layout
    await page.getByLabel('Nome ENS').fill('x')
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await expect(page.getByText('Informe o código de indicação (mín. 3 caracteres)')).toBeVisible()
    await expect(page.getByLabel('Código de indicação')).toHaveAttribute('aria-invalid', 'true')

    await app.fillCheckoutAndReview()
    const stockBefore = await app.mock((m) => m.snapshot().nfts[0]!.editions.find((e) => e.label === '1/50')!.available)
    await page.getByRole('button', { name: /Confirmar compra/ }).click()
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/ID da transação/)).toBeVisible()
    await expect(page.getByRole('table')).toContainText(nfts.emerald.title)
    await expect(page.getByRole('table')).toContainText('(x 2)')
    await expect(page.getByText('2.396 ETH').first()).toBeVisible()

    // Estoque baixou e o carrinho foi esvaziado apenas no que foi comprado.
    const stockAfter = await app.mock((m) => m.snapshot().nfts[0]!.editions.find((e) => e.label === '1/50')!.available)
    expect(stockAfter).toBe(stockBefore - 2)
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('o recibo é um snapshot: mudanças posteriores no catálogo não o alteram', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await app.fillCheckoutAndReview()
    await page.getByRole('button', { name: /Confirmar compra/ }).click()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    await app.mock((m, e) => m.updateEdition('nft-001', e, { price: '9.99' }), nfts.emerald.edition)
    await page.reload()
    await expect(page.getByRole('table')).toContainText('1.19 ETH')
    await expect(page.getByRole('table')).not.toContainText('9.99')
  })
})
