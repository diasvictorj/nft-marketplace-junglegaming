import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('9. Preço/disponibilidade via Socket.IO durante o checkout', () => {
  test('preço muda no carrinho: aviso, resumo atualizado e checkout exige nova confirmação', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await app.waitForSocket()

    // 1–3: item no carrinho, preço muda durante a navegação, a UI informa e recalcula.
    await app.mock((m, e) => m.updateEdition('nft-001', e, { price: '1.5' }), nfts.emerald.edition)
    await expect(page.getByText('Preços atualizados desde que você adicionou estes itens:')).toBeVisible()
    await expect(page.getByText('Emerald Ape #042 (1/50): de 1.19 ETH para 1.5 ETH')).toBeVisible()
    await expect(page.locator('dl').filter({ hasText: 'Subtotal' })).toContainText('1.516 ETH')

    // 4: o checkout bloqueia a confirmação com cotação desatualizada.
    await app.fillCheckoutAndReview()
    await app.mock((m, e) => m.updateEdition('nft-001', e, { price: '1.75' }), nfts.emerald.edition)
    await expect(page.getByText('Os valores mudaram desde a revisão.')).toBeVisible()
    await page.getByRole('button', { name: /Confirmar compra/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Os valores do pedido mudaram' })
    await expect(dialog).toContainText('1.5 ETH → 1.75 ETH')
    expect(await app.orderCount()).toBe(0)
    await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await page.getByRole('button', { name: /Confirmar compra · 1.766 ETH/ }).click()
    await expect(page).toHaveURL(/\/orders\//)
    expect(await app.orderCount()).toBe(1)
  })

  test.describe('cenário: sold-out', () => {
    test.use({ scenario: 'sold-out' })
    test('edição esgota durante a compra e o pedido é impedido', async ({ app, page }) => {
      await app.login(users.ana)
      await app.addToCart(nfts.emerald.id)
      await app.waitForSocket()
      // O cenário esgota a edição 4 s após a 1ª cotação.
      await expect(page.getByText('Esta edição esgotou. Remova o item para continuar.')).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
      await expect(page.getByText(/Disponibilidade alterada/)).toBeVisible()
    })
  })

  test.describe('cenário: price-changed', () => {
    test.use({ scenario: 'price-changed' })
    test('mudança automática durante a revisão exige nova confirmação', async ({ app, page }) => {
      await app.login(users.ana)
      await app.addToCart(nfts.emerald.id)
      await app.fillCheckoutAndReview()
      await expect(page.getByText('Os valores mudaram desde a revisão.')).toBeVisible({ timeout: 10_000 })
      await page.getByRole('button', { name: /Confirmar compra/ }).click()
      await expect(page.getByRole('dialog', { name: 'Os valores do pedido mudaram' })).toBeVisible()
      expect(await app.orderCount()).toBe(0)
    })
  })
})
