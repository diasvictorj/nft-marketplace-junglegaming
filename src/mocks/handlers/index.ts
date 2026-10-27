import type { RequestHandler } from 'msw'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { catalogHandlers } from './catalog'
import { cartHandlers, favoritesHandlers, orderHandlers } from './commerce'

/**
 * Handlers REST. Todos leem/escrevem o mesmo estado em ../db, mantendo
 * catálogo, favoritos, carrinho, pedidos, perfil e carteiras consistentes.
 * Contratos: src/lib/api/contracts.ts · Tabela de endpoints: ARCHITECTURE.md.
 */
export const restHandlers: RequestHandler[] = [
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...accountHandlers,
]
