import { env } from '@/lib/env'
import { resolveScenario } from './scenarios'

/**
 * Inicia o MSW (REST + Socket.IO) antes do primeiro render quando VITE_ENABLE_MOCKS=true.
 * `?scenario=<id>` diferente do atual reseta o estado para o cenário escolhido.
 */
export async function enableMocking() {
  if (!env.mocksEnabled) return
  const { config, fromUrl } = resolveScenario(env.defaultScenario)
  const [{ worker }, store, orders, http, { mockControl }] = await Promise.all([
    import('./browser'),
    import('./db/store'),
    import('./domain/orders'),
    import('./handlers/http'),
    import('./control'),
  ])
  await store.initDb(config, fromUrl)
  http.resetNetworkState()
  await worker.start({
    quiet: true,
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  orders.resumePendingSettlements()
  window.__mock = mockControl
  console.info(`[mocks] MSW ativo · cenário: ${config.id}`)
}
