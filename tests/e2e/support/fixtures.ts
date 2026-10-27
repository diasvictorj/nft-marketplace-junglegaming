import { test as base, expect, type Page } from '@playwright/test'
import type { MockControl } from '../../../src/mocks/control'
import type { ScenarioId } from '../../../src/mocks/scenarios'
import { users, type DemoUser } from '../fixtures/data'

/**
 * Fixtures E2E. Cada teste roda em um contexto novo (localStorage vazio) e abre o app
 * com `?scenario=<id>`, o que reseta o estado simulado para um cenário conhecido.
 * REST passa pelos handlers MSW; eventos passam pelo servidor Socket.IO simulado
 * (window.__mock → socket → socket.io-client), nunca por setters da UI.
 */
type Fixtures = {
  scenario: ScenarioId
  app: App
  isMobile: boolean
}

export class App {
  readonly page: Page
  scenario: ScenarioId
  constructor(page: Page, scenario: ScenarioId) {
    this.page = page
    this.scenario = scenario
  }

  /** Troca o cenário no meio do teste (reseta o estado simulado). */
  async switchScenario(id: ScenarioId) {
    this.scenario = id
    await this.mock((m, s) => m.setScenario(s), id)
    await this.goto('/')
  }

  /** Navega garantindo o cenário (1ª visita reseta o estado simulado). */
  async goto(path = '/') {
    const sep = path.includes('?') ? '&' : '?'
    await this.page.goto(`${path}${sep}scenario=${this.scenario}`)
    await this.page.waitForFunction(() => !!window.__mock)
    await this.page.locator('#main').waitFor({ state: 'attached' })
  }

  /** Executa um controle da simulação no navegador (ex.: emitir evento pelo socket). */
  async mock<R, A = undefined>(fn: (m: MockControl, arg: A) => R | Promise<R>, arg?: A): Promise<R> {
    await this.page.waitForFunction(() => !!window.__mock)
    return this.page.evaluate(
      ({ src, arg }) => new Function('m', 'a', `return (${src})(m, a)`)(window.__mock, arg),
      { src: fn.toString(), arg },
    ) as Promise<R>
  }

  async waitForSocket() {
    await expect.poll(() => this.mock((m) => m.socketConnections()), { timeout: 10_000 }).toBeGreaterThan(0)
  }

  async login(user: DemoUser = users.ana, redirect?: string) {
    await this.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
    await this.fillLogin(user)
    await this.page.waitForURL((url) => !url.pathname.startsWith('/login'))
  }

  async fillLogin(user: DemoUser) {
    const dialog = this.page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(user.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(user.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  }

  async logout() {
    await this.page.goto('/profile')
    await this.page.getByRole('button', { name: 'Sair' }).click()
    await expect(this.page.getByText('Você saiu da sua conta.')).toBeVisible()
  }

  /** Adiciona um NFT ao carrinho pelo detalhe (edição padrão). */
  async addToCart(nftId: string, quantity = 1, goToCart = true) {
    await this.page.goto(`/nfts/${nftId}`)
    for (let i = 1; i < quantity; i++) await this.page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    if (goToCart) {
      await this.page.getByRole('button', { name: 'COMPRAR' }).click()
      await this.page.waitForURL('**/cart')
    } else {
      await this.page.getByRole('button', { name: 'Adicionar ao carrinho e continuar navegando' }).click()
      await expect(this.page.getByText('adicionado ao carrinho').first()).toBeVisible()
    }
  }

  /** Preenche o checkout, conecta a carteira e vai para a revisão. */
  async fillCheckoutAndReview() {
    const page = this.page
    await page.goto('/checkout')
    await page.getByLabel('Código de indicação').fill('AMIGO1')
    await page.getByLabel('Nome ENS').fill('colecionador-teste')
    const connect = page.getByRole('button', { name: 'Conectar carteira' })
    if (await connect.isVisible()) await connect.click()
    await expect(page.getByText('Conectada', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Revisar pedido' }).click()
    await expect(page.getByRole('heading', { name: 'Revise seu pedido' })).toBeVisible()
  }

  orderCount() {
    return this.mock((m) => m.snapshot().orders.length)
  }
}

export const test = base.extend<Fixtures>({
  scenario: ['success', { option: true }],
  isMobile: async ({}, use, testInfo) => use(testInfo.project.name === 'mobile'),
  // Automática: todo teste começa no app com o cenário aplicado (estado isolado).
  app: [
    async ({ page, scenario }, use) => {
      const app = new App(page, scenario)
      await app.goto('/')
      await use(app)
    },
    { auto: true },
  ],
})

export { expect }
export { users }
