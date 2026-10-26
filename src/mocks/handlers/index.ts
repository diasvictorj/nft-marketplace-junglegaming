import { HttpResponse, http, type RequestHandler } from 'msw'

/**
 * Handlers REST. Cada recurso ganha seu arquivo (session, nfts, favorites, cart,
 * quote, orders, profile, wallets) lendo/escrevendo no mesmo estado em ../db,
 * para manter consistência entre catálogo, carrinho, pedidos etc.
 *
 * TODO: implementar recursos conforme contratos em src/lib/api/contracts.ts.
 */
export const restHandlers: RequestHandler[] = [
  http.get('/api/health', () => HttpResponse.json({ ok: true })),
]
