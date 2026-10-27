import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('7. Falhas de pagamento, clique repetido e timeout', () => {
  test.describe('cenário: payment-declined', () => {
    test.use({ scenario: 'payment-declined' })
    test('pagamento recusado preserva os itens e não mostra confirmação', async ({ app, page }) => {
      await app.login(users.ana)
      await app.addToCart(nfts.emerald.id)
      await app.fillCheckoutAndReview()
      await page.getByRole('button', { name: /Confirmar compra/ }).click()
      await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toHaveCount(0)
      await page.getByRole('link', { name: 'Ver carrinho' }).click()
      await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(nfts.emerald.title)
    })
  })

  test('cliques repetidos criam um único pedido', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await app.fillCheckoutAndReview()
    const confirm = page.getByRole('button', { name: /Confirmar compra/ })
    await confirm.dblclick()
    await confirm.click({ force: true, timeout: 1000 }).catch(() => {})
    await expect(page).toHaveURL(/\/orders\/ord_/)
    expect(await app.orderCount()).toBe(1)
  })

  test.describe('cenário: order-timeout', () => {
    test.use({ scenario: 'order-timeout' })
    test('timeout após criar o pedido: reenvio recupera o MESMO pedido', async ({ app, page }) => {
      await app.login(users.ana)
      await app.addToCart(nfts.emerald.id)
      await app.fillCheckoutAndReview()
      await page.getByRole('button', { name: /Confirmar compra/ }).click()
      await expect(page.getByText(/Não recebemos a confirmação do servidor/)).toBeVisible({ timeout: 15_000 })
      expect(await app.orderCount()).toBe(1)
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(page).toHaveURL(/\/orders\/ord_1001/)
      expect(await app.orderCount()).toBe(1)
      await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    })

    test('timeout seguido de refresh: retomar usa a mesma chave', async ({ app, page }) => {
      await app.login(users.ana)
      await app.addToCart(nfts.emerald.id)
      await app.fillCheckoutAndReview()
      await page.getByRole('button', { name: /Confirmar compra/ }).click()
      await expect(page.getByText(/Não recebemos a confirmação do servidor/)).toBeVisible({ timeout: 15_000 })
      await page.reload()
      // O pedido já existe (pendente ou liquidado): nenhuma nova compra é criada.
      const banner = page.getByRole('button', { name: 'Retomar compra' }).or(page.getByRole('link', { name: 'Acompanhar pedido' }))
      await banner.first().click()
      await expect(page).toHaveURL(/\/orders\/ord_1001/)
      expect(await app.orderCount()).toBe(1)
    })
  })
})
