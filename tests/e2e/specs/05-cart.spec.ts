import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('5. Carrinho', () => {
  test('quantidades, remoção, cupom e totais da API', async ({ app, page }) => {
    await app.addToCart(nfts.emerald.id, 2, false)
    await app.addToCart(nfts.neon.id)
    const lines = page.getByRole('list', { name: 'Itens do carrinho' })
    await expect(lines.getByRole('listitem')).toHaveCount(2)
    const summary = page.locator('dl').filter({ hasText: 'Subtotal' })
    await expect(summary).toContainText('4.37 ETH') // 2 × 1.19 + 1.99
    await expect(summary).toContainText('4.386 ETH') // + 0.016

    await page.getByRole('button', { name: `Aumentar quantidade de ${nfts.neon.title}` }).click()
    await expect(summary).toContainText('6.36 ETH')
    await page.getByRole('button', { name: `Remover ${nfts.neon.title} (1/50) do carrinho` }).click()
    await expect(lines.getByRole('listitem')).toHaveCount(1)
    await expect(summary).toContainText('2.38 ETH')

    const coupon = page.getByLabel('Código promocional')
    await coupon.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Cupom inválido. Confira o código e tente novamente.')).toBeVisible()
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')
    await coupon.fill('VERAO24')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Este cupom expirou.')).toBeVisible()
    await coupon.fill('kurio10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(summary).toContainText('(-) 0.238 ETH')
    await expect(summary).toContainText('2.158 ETH')
    await page.getByRole('button', { name: 'Remover cupom' }).click()
    await expect(summary).toContainText('2.396 ETH')
  })

  test('carrinho persiste após refresh e itens do visitante são preservados no login', async ({ app, page }) => {
    await app.addToCart(nfts.emerald.id)
    await page.reload()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(nfts.emerald.title)
    await app.login(users.ana, '/cart')
    await expect(page).toHaveURL(/\/cart/)
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(nfts.emerald.title)
    await page.reload()
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(nfts.emerald.title)
  })

  test.describe('cenário: coupon-expired', () => {
    test.use({ scenario: 'coupon-expired' })
    test('qualquer cupom expirado é rejeitado', async ({ app, page }) => {
      await app.addToCart(nfts.emerald.id)
      await page.getByLabel('Código promocional').fill('KURIO10')
      await page.getByRole('button', { name: 'Aplicar' }).click()
      await expect(page.getByText('Este cupom expirou.')).toBeVisible()
    })
  })
})
