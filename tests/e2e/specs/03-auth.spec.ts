import { nfts, users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('3. Conta e sessão', () => {
  test('cadastro valida campos, trata conflito e cria a conta', async ({ app, page }) => {
    await app.goto('/signup')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(dialog.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
    await expect(dialog.getByText('Informe o e-mail')).toBeVisible()

    await dialog.getByLabel('Nome de usuário').fill('novo_colecionador')
    await dialog.getByLabel('E-mail').fill(users.ana.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('Fraca123')
    await dialog.getByLabel('Confirmar senha').fill('Outra@123')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(dialog.getByText('Inclua ao menos um símbolo')).toBeVisible()
    await expect(dialog.getByText('As senhas não coincidem')).toBeVisible()

    await dialog.getByLabel('Senha', { exact: true }).fill('Forte@123')
    await dialog.getByLabel('Confirmar senha').fill('Forte@123')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(dialog.getByText('Este e-mail já está cadastrado')).toBeVisible()

    await dialog.getByLabel('E-mail').fill('novo@example.com')
    await dialog.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByText('Conta criada!')).toBeVisible()
    await page.goto('/profile')
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue('novo@example.com')
  })

  test('login com credenciais inválidas e retorno ao fluxo anterior', async ({ app, page }) => {
    await page.goto(`/nfts/${nfts.emerald.id}`)
    await page.getByRole('button', { name: `Favoritar ${nfts.emerald.title}` }).first().click()
    await expect(page).toHaveURL(/\/login\?redirect=/)
    await app.fillLogin({ ...users.ana, password: 'errada' })
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('E-mail ou senha incorretos.')
    await app.fillLogin(users.ana)
    await expect(page).toHaveURL(new RegExp(`/nfts/${nfts.emerald.id}`))
  })

  test('rota privada exige login e a sessão sobrevive ao refresh', async ({ app, page }) => {
    await page.goto('/wallets')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fwallets/)
    await app.fillLogin(users.ana)
    await expect(page).toHaveURL(/\/wallets$/)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })

  test('expiração durante a navegação leva ao login e retoma a rota', async ({ app, page }) => {
    await app.login(users.ana)
    await page.goto('/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue(users.ana.name)
    await app.mock((m) => m.expireSessions())
    await page.getByRole('link', { name: 'Carteiras', exact: true }).click()
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expect(page.getByText('Sua sessão expirou.').first()).toBeVisible()
    await app.fillLogin(users.ana)
    await expect(page).toHaveURL(/\/wallets/)
  })

  test.describe('cenário: session-expired (relógio controlado)', () => {
    test.use({ scenario: 'session-expired' })
    test('expira sozinha após o TTL sem interação', async ({ app, page }) => {
      await page.clock.install()
      await app.login(users.ana)
      await page.goto('/profile')
      await expect(page.getByLabel('Nome de exibição')).toHaveValue(users.ana.name)
      await page.clock.fastForward(21_000)
      await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    })
  })

  test('logout e troca de usuário não vazam dados privados', async ({ app, page }) => {
    await app.login(users.ana)
    await page.goto('/?favorites=true')
    await expect(page.getByText(nfts.sage.title)).toBeVisible()
    await app.addToCart(nfts.emerald.id)
    await expect(page.getByRole('list', { name: 'Itens do carrinho' })).toContainText(nfts.emerald.title)

    await app.logout()
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()

    await app.login(users.bruno)
    await page.goto('/?favorites=true')
    await expect(page.getByText(nfts.neon.title)).toBeVisible()
    await expect(page.getByText(nfts.sage.title)).toHaveCount(0)
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
    await page.goto('/profile')
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue(users.bruno.email)
  })
})
