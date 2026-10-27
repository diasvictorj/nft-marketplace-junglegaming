import { expect, test } from '../support/fixtures'

test.describe('1. Catálogo: busca, filtros, ordenação, paginação e histórico', () => {
  test('filtros combinados, ordenação e paginação compõem a URL e sobrevivem a refresh/histórico', async ({ page, isMobile }) => {
    const results = page.getByRole('list', { name: 'NFTs' })
    await expect(results.getByRole('listitem')).toHaveCount(9)
    await expect(page.getByText('40 NFTs encontrados')).toBeVisible()

    // Paginação
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    // Filtro de coleção reinicia a paginação
    const openFilters = async () => {
      if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    }
    const closeFilters = async () => {
      if (isMobile) await page.keyboard.press('Escape')
    }
    await openFilters()
    await page.getByRole('button', { name: /^Arte digital/ }).click()
    await expect(page).not.toHaveURL(/page=/)
    await expect(page).toHaveURL(/category/)
    await page.getByRole('button', { name: /^Ethereum/ }).click()
    await closeFilters()
    // Arte digital + Ethereum = 4 NFTs no seed.
    const filteredCount = 4
    await expect(page.getByText('4 NFTs encontrados')).toBeVisible()
    await expect(results.getByRole('listitem')).toHaveCount(filteredCount)

    // Ordenação por menor preço
    if (isMobile) await openFilters()
    await page.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    if (isMobile) await closeFilters()
    await expect(page).toHaveURL(/sort=price-asc/)
    const prices = await results.locator('p, span').filter({ hasText: /^\d+(\.\d+)? ETH$/ }).allInnerTexts()
    const numbers = prices.map((p) => Number(p.replace(' ETH', '')))
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))

    // Refresh preserva o estado
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(results.getByRole('listitem')).toHaveCount(filteredCount)

    // Histórico: voltar desfaz a ordenação
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=price-asc/)
    await expect(page).toHaveURL(/category/)
  })

  test('busca por texto com debounce reflete na URL e na API', async ({ page }) => {
    const search = page.locator('#busca:visible, #busca-desktop:visible').first()
    await search.fill('golden')
    await expect(page).toHaveURL(/q=golden/)
    const items = page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')
    await expect(items.first()).toContainText(/Golden|Amber|Honey|Saffron|Copper|Brass|Topaz|Ochre|Sunset/)
    await expect(page.getByText(/10 NFTs encontrados/)).toBeVisible()
    await page.goBack()
    await expect(search).toHaveValue('')
  })

  test.describe('cenário: resultado vazio', () => {
    test.use({ scenario: 'empty' })
    test('mostra estado vazio', async ({ page }) => {
      await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible()
    })
  })

  test.describe('cenário: respostas fora de ordem', () => {
    test.use({ scenario: 'out-of-order' })
    test('a resposta antiga não sobrescreve a consulta atual', async ({ page }) => {
      await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
      // Duas buscas seguidas: a 1ª resposta chega depois da 2ª.
      await page.goto('/?q=emerald')
      await page.goto('/?q=lilac')
      await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')).toHaveCount(1)
      await page.waitForTimeout(1800)
      await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')).toHaveCount(1)
      await expect(page.getByRole('list', { name: 'NFTs' })).toContainText('Lilac Wanderer')
    })
  })
})
