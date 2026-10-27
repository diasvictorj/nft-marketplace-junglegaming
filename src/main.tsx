import { enableMocking } from '@/mocks'
import './index.css'

/**
 * O app é importado só depois do MSW: o engine.io-client captura `globalThis.WebSocket`
 * no momento do import, então o interceptor de WebSocket precisa estar instalado antes.
 */
enableMocking()
  .then(() => import('./app/bootstrap'))
  .then(({ mount }) => mount(document.getElementById('root')!))
