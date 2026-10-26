import { expect, test } from '@playwright/test'

test('home carrega com mocks ativos', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible()
})

test('rota inexistente mostra página 404', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})

test('rota privada redireciona ao login preservando o destino', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/login\?redirect=/)
})
