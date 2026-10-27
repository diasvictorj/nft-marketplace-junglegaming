import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('4. Favoritos', () => {
  test('favorito persiste para o usuário autenticado após refresh', async ({ app, page }) => {
    await app.login(users.ana)
    await page.goto(`/nfts/${nfts.emerald.id}`)
    const button = page.getByRole('button', { name: `Favoritar ${nfts.emerald.title}` }).first()
    await button.click()
    await expect(page.getByRole('button', { name: `Remover ${nfts.emerald.title} dos favoritos` }).first()).toHaveAttribute('aria-pressed', 'true')
    // Confirmado pelo servidor simulado antes do refresh.
    await expect.poll(() => app.mock((m) => m.snapshot().favorites.u1)).toContain(nfts.emerald.id)
    await page.reload()
    await expect(page.getByRole('button', { name: `Remover ${nfts.emerald.title} dos favoritos` }).first()).toBeVisible()
    await page.goto('/?favorites=true')
    await expect(page.getByRole('list', { name: 'NFTs' })).toContainText(nfts.emerald.title)
  })

  test.describe('cenário: http-5xx (mutation falha)', () => {
    test.use({ scenario: 'http-5xx' })
    test('atualização otimista faz rollback e informa a falha', async ({ app, page }) => {
      await app.login(users.ana)
      await page.goto(`/nfts/${nfts.emerald.id}`)
      const fav = page.getByRole('button', { name: `Favoritar ${nfts.emerald.title}` }).first()
      await fav.click()
      // Otimista: o estado muda antes da resposta…
      await expect(page.getByRole('button', { name: `Remover ${nfts.emerald.title} dos favoritos` }).first()).toBeVisible()
      // …e volta quando a API falha.
      await expect(page.getByText(`Não foi possível favoritar ${nfts.emerald.title}.`)).toBeVisible()
      await expect(page.getByRole('button', { name: `Favoritar ${nfts.emerald.title}` }).first()).toHaveAttribute('aria-pressed', 'false')
      // Recuperação: o servidor volta e a ação funciona.
      await app.switchScenario('success')
      await app.login(users.ana, `/nfts/${nfts.emerald.id}`)
      await page.getByRole('button', { name: `Favoritar ${nfts.emerald.title}` }).first().click()
      await expect(page.getByRole('button', { name: `Remover ${nfts.emerald.title} dos favoritos` }).first()).toBeVisible()
      await expect.poll(() => app.mock((m) => m.snapshot().favorites.u1)).toContain(nfts.emerald.id)
      await page.reload()
      await expect(page.getByRole('button', { name: `Remover ${nfts.emerald.title} dos favoritos` }).first()).toBeVisible()
    })
  })
})
