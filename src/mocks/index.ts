import { env } from '@/lib/env'
import { resolveScenario } from './scenarios'

/** Inicia o MSW antes do primeiro render quando VITE_ENABLE_MOCKS=true. */
export async function enableMocking() {
  if (!env.mocksEnabled) return
  const scenario = resolveScenario(env.defaultScenario)
  const { worker } = await import('./browser')
  await worker.start({
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  console.info(`[mocks] MSW ativo · cenário: ${scenario.id}`)
}
