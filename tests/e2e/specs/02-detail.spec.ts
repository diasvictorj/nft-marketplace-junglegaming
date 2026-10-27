import { nfts } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('2. Detalhe: acesso direto e recurso inexistente', () => {
  test('acesso direto ao detalhe carrega galeria, edições e preço', async ({ page }) => {
    await page.goto(`/nfts/${nfts.emerald.id}`)
    await expect(page.getByRole('heading', { level: 1, name: nfts.emerald.title })).toBeVisible()
    await expect(page.getByText(nfts.emerald.price).first()).toBeVisible()
    await expect(page.getByRole('radio', { name: '1/50' })).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Ver imagem 2 de 4' }).click()
    await expect(page.getByRole('button', { name: 'Ver imagem 2 de 4' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('NFT inexistente mostra página de não encontrado', async ({ page }) => {
    await page.goto('/nfts/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })

  test('rota inexistente mostra 404', async ({ page }) => {
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('edição esgotada fica indisponível e a quantidade respeita o limite', async ({ page }) => {
    await page.goto(`/nfts/${nfts.soldOut.id}`)
    await expect(page.getByRole('button', { name: 'ESGOTADO' })).toBeDisabled()
    for (const radio of await page.getByRole('radio').all()) await expect(radio).toBeDisabled()

    await page.goto(`/nfts/${nfts.emerald.id}`)
    await page.getByRole('radio', { name: '1/1', exact: true }).click()
    await expect(page.getByText('1 disponível(is).')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aumentar quantidade' })).toBeDisabled()
  })
})
