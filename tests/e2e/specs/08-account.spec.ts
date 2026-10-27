import { users } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

// PNG 1×1 válido.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('8. Perfil, avatar, senha e carteiras', () => {
  test.beforeEach(async ({ app }) => {
    await app.login(users.ana, '/profile')
  })

  test('edita dados com validação, conflito da API e persistência', async ({ page }) => {
    const name = page.getByLabel('Nome de exibição')
    await name.fill('A')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Use entre 2 e 60 caracteres')).toBeVisible()
    await expect(name).toHaveAttribute('aria-invalid', 'true')

    await name.fill('Ana Atualizada')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(users.bruno.email)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('E-mail já cadastrado')).toBeVisible()

    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(users.ana.email)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Perfil atualizado.').first()).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Atualizada')
  })

  test('avatar: tipo inválido é recusado e imagem válida persiste', async ({ page }) => {
    const input = page.locator('#avatar-input')
    await input.setInputFiles({ name: 'doc.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByText('Envie uma imagem PNG, JPEG ou WebP.')).toBeVisible()
    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('Avatar atualizado.').first()).toBeVisible()
    await page.reload()
    await expect(page.getByRole('img', { name: `Avatar de ${users.ana.name}` })).toBeVisible()
  })

  test('senha: senha atual incorreta e troca bem-sucedida', async ({ app, page }) => {
    await page.getByLabel('Senha atual').fill('errada')
    await page.getByLabel('Nova senha', { exact: true }).fill('Nova@1234')
    await page.getByLabel('Confirmar nova senha').fill('Nova@1234')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha atual incorreta')).toBeVisible()
    await page.getByLabel('Senha atual').fill(users.ana.password)
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha alterada.').first()).toBeVisible()
    await app.logout()
    await app.login({ ...users.ana, password: 'Nova@1234' })
    await expect(page.getByText(`Bem-vindo(a), ${users.ana.name}!`)).toBeVisible()
  })

  test('carteiras: validação, edição e cadastro de secundária', async ({ app, page }) => {
    await app.logout()
    await app.login(users.bruno, '/wallets')
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/formato 0x seguido de 40/)).toBeVisible()
    await primary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await primary.getByLabel('Apelido da carteira').fill('Principal do Bruno')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira principal salva.').first()).toBeVisible()

    await page.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await secondary.getByLabel('Apelido da carteira').fill('Reserva')
    await secondary.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111')
    await secondary.getByRole('combobox', { name: 'Rede' }).click()
    await page.getByRole('option', { name: 'Polygon' }).click()
    await secondary.getByRole('combobox', { name: 'Tipo de carteira' }).click()
    await page.getByRole('option', { name: 'MetaMask' }).click()
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByText('Este endereço já está cadastrado')).toBeVisible()
    await secondary.getByLabel('Endereço da carteira').fill('0x2222222222222222222222222222222222222222')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByText('Carteira secundária salva.').first()).toBeVisible()

    await page.reload()
    await expect(page.getByRole('form', { name: 'Carteira principal' }).getByLabel('Apelido da carteira')).toHaveValue('Principal do Bruno')
    await expect(page.getByRole('form', { name: 'Carteira secundária' }).getByLabel('Apelido da carteira')).toHaveValue('Reserva')
  })

  test.describe('cenário: unauthorized', () => {
    test.use({ scenario: 'unauthorized' })
    test('acesso não autorizado mostra erro sem dados', async ({ page }) => {
      await expect(page.getByText('Você não tem permissão para acessar estes dados.')).toBeVisible()
    })
  })
})
