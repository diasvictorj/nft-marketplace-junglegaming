import { nfts } from '../fixtures/data'
import { expect, test } from '../support/fixtures'

test.describe('11. Teclado, foco de diálogos e validação', () => {
  test('skip link leva ao conteúdo principal', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navegação por Tab é avaliada no desktop')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main')).toBeFocused()
  })

  test('cards do catálogo são acessíveis por teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Navegação por Tab é avaliada no desktop')
    const link = page.getByRole('link', { name: nfts.emerald.title }).first()
    await link.focus()
    await expect(link).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(nfts.emerald.id))
  })

  test('diálogo de imagem prende o foco e fecha com Esc devolvendo o foco', async ({ page }) => {
    await page.goto(`/nfts/${nfts.emerald.id}`)
    const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('login abre como diálogo com foco no 1º campo e erros associados aos campos', async ({ app, page }) => {
    await app.goto('/login')
    const dialog = page.getByRole('dialog', { name: 'Entrar' })
    await expect(dialog.getByLabel('E-mail')).toBeFocused()
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    const email = dialog.getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy!.split(' ')[0]!.replace(/:/g, '\\:')}`)).toHaveText(/Informe o e-mail/)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/$/)
  })

  test('não há overflow horizontal na página inicial e no detalhe', async ({ page }) => {
    for (const path of ['/', `/nfts/${nfts.emerald.id}`, '/cart']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      // Compara com a largura configurada: no mobile, conteúdo largo amplia o viewport de layout.
      const width = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth))
      expect(width, path).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
  })
})
