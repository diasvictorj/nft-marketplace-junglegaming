import { expect, test } from '../support/fixtures'

test.describe('12. Skeletons, falha e nova tentativa', () => {
  test.describe('cenário: slow', () => {
    test.use({ scenario: 'slow' })
    test('skeletons com shimmer durante carregamento lento', async ({ page }) => {
      await page.goto('/?q=ape')
      await expect(page.getByText('Carregando NFTs…')).toBeAttached()
      await expect(page.locator('.skeleton:visible').first()).toBeVisible()
      await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('[aria-busy="true"] .skeleton')).toHaveCount(0)
    })
  })

  test.describe('cenário: http-5xx', () => {
    test.use({ scenario: 'http-5xx' })
    test('falha do catálogo após retries, feedback e recuperação com nova tentativa', async ({ page }) => {
      await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível carregar o catálogo' })).toBeVisible({ timeout: 15_000 })
      await page.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')).toHaveCount(9)
    })
  })

  test.describe('cenário: network-down', () => {
    test.use({ scenario: 'network-down' })
    test('sem conexão: mensagem de rede', async ({ page }) => {
      await expect(page.getByText('Sem conexão com o servidor. Verifique sua rede e tente novamente.')).toBeVisible({ timeout: 15_000 })
    })
  })
})
