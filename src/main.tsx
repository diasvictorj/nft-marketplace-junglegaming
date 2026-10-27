import { enableMocking } from '@/mocks'
import './index.css'

// O app só é carregado depois que os mocks (REST + WebSocket) estão ativos, para que
// as primeiras requisições sejam interceptadas.
enableMocking()
  .then(() => import('./app/bootstrap'))
  .then(({ mount }) => mount(document.getElementById('root')!))
