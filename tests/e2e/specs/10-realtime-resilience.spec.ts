import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('10. Eventos duplicados/antigos, desconexão e retomada de pedido pendente', () => {
  test('evento duplicado não reaplica efeitos e evento antigo não regride o estado', async ({ app, page }) => {
    await page.goto(`/nfts/${nfts.emerald.id}`)
    await app.waitForSocket()
    const price = page.locator('p[aria-live="polite"]').filter({ hasText: 'ETH' })
    await app.mock((m, e) => m.updateEdition('nft-001', e, { price: '2.5' }), nfts.emerald.edition)
    await expect(price).toContainText('2.5 ETH')
    // Duplicata (mesmo eventId) e versão antiga com outro preço: ignorados.
    await app.mock((m) => m.replayLast('nft.updated'))
    await app.mock((m) => m.emitStaleNft('nft-001', '0.01'))
    await page.waitForTimeout(500)
    await expect(price).toContainText('2.5 ETH')
  })

  test('desconexão com pedido pendente: reconecta, reconcilia via REST e não duplica', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await app.fillCheckoutAndReview()
    await app.waitForSocket()
    await page.getByRole('button', { name: /Confirmar compra/ }).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento…' })).toBeVisible()
    // Socket cai antes da liquidação: o evento order.updated é perdido.
    await app.mock((m) => m.dropSocket(4000))
    await expect(page.getByText(/reconectando/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 20_000 })
    expect(await app.orderCount()).toBe(1)
  })

  test('refresh com pedido pendente recupera o estado sem nova compra', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await app.fillCheckoutAndReview()
    await page.getByRole('button', { name: /Confirmar compra/ }).click()
    await expect(page.getByRole('heading', { name: 'Processando pagamento…' })).toBeVisible()
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 20_000 })
    expect(await app.orderCount()).toBe(1)
    // Estado terminal: o recibo não muda após nova carga.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  })

  test('eventos privados de outra sessão não atualizam o usuário atual', async ({ app, page }) => {
    await app.login(users.ana)
    await app.addToCart(nfts.emerald.id)
    await app.fillCheckoutAndReview()
    await page.getByRole('button', { name: /Confirmar compra/ }).click()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 20_000 })

    // Troca de usuário SEM recarregar (o servidor simulado e seu log de eventos vivem na página).
    await page.getByRole('link', { name: 'Meu perfil' }).click()
    await page.getByRole('button', { name: 'Sair' }).click()
    await page.getByRole('link', { name: 'Entrar' }).first().click()
    await app.fillLogin(users.bruno)
    await expect(page.getByText(`Bem-vindo(a), ${users.bruno.name}!`)).toBeVisible()
    await app.waitForSocket()

    // O evento de Ana é entregue à conexão de Bruno (vazamento simulado) e deve ser descartado.
    expect(await app.mock((m) => m.leakLastOrderEvent())).toBe(true)
    await page.evaluate(() => {
      history.pushState({}, '', '/orders/ord_1001')
      dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page.getByText('Você não tem acesso a este pedido.')).toBeVisible()
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toHaveCount(0)
  })
})
