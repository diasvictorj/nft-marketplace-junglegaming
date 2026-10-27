import type { NftUpdatedEvent } from '@/lib/api/contracts'
import { getDb, getScenario, mutate, resetDb } from './db/store'
import { updateNft } from './domain/commerce'
import { settleIfDue } from './domain/orders'
import { scenarios, type ScenarioId } from './scenarios'
import { connectionCount, dropConnections, emitRaw, replayEvent } from './socket'

/**
 * Controles da simulação, expostos em `window.__mock` (painel de mocks e Playwright).
 * Tudo que é "evento" passa pelo servidor Socket.IO simulado → socket.io-client;
 * nada aqui escreve no cache do React Query ou chama setters da UI.
 */
export const mockControl = {
  scenarios: () => Object.values(scenarios).map(({ id, description }) => ({ id, description })),
  scenario: () => getScenario().id,
  /** Troca de cenário restaurando integralmente o estado conhecido. */
  setScenario: (id: ScenarioId) => resetDb(id),
  reset: () => resetDb(),

  /** Expira todas as sessões ativas (a próxima requisição autenticada recebe 401). */
  expireSessions: () =>
    mutate((db) => {
      for (const s of db.sessions) s.expiresAt = Date.now() - 1
    }),

  /** Altera preço/disponibilidade de uma edição e emite `nft.updated`. */
  updateEdition: (nftId: string, editionId: string, patch: { price?: string; available?: number }) =>
    updateNft(nftId, (nft) => {
      const edition = nft.editions.find((e) => e.id === editionId)
      if (!edition) throw new Error(`edição ${editionId} inexistente`)
      if (patch.price !== undefined) edition.price = patch.price
      if (patch.available !== undefined) edition.available = patch.available
    }).version,

  /** Reenvia o último evento do tipo informado (duplicata com o mesmo eventId). */
  replayLast: (type: 'nft.updated' | 'order.updated') => replayEvent((e) => e.type === type),

  /** Reenvia o último `order.updated` a TODAS as conexões, ignorando o roteamento por sessão. */
  leakLastOrderEvent: () => replayEvent((e) => e.type === 'order.updated', true),

  /** Emite um `nft.updated` antigo (versão anterior) com dados divergentes. */
  emitStaleNft: (nftId: string, price: string) => {
    const nft = structuredClone(getDb().nfts.find((n) => n.id === nftId)!)
    const version = nft.version - 1
    for (const e of nft.editions) e.price = price
    const envelope: NftUpdatedEvent = {
      eventId: `nft:${nftId}:stale:${version}:${Date.now()}`,
      type: 'nft.updated',
      resource: { kind: 'nft', id: nftId },
      version,
      sessionId: null,
      emittedAt: new Date().toISOString(),
      payload: { nft: { ...nft, version } },
    }
    emitRaw(envelope)
  },

  /** Derruba o socket; reconexões são recusadas por `blockMs`. */
  dropSocket: (blockMs = 0) => dropConnections(blockMs),
  socketConnections: () => connectionCount(),

  /** Força a liquidação imediata dos pedidos pendentes. */
  settlePendingOrders: () => {
    for (const o of getDb().orders.filter((x) => x.status === 'pending')) {
      o.settleAt = Date.now()
      settleIfDue(o)
    }
  },

  /** Leitura do estado (asserções de teste: nº de pedidos, estoque etc.). */
  snapshot: () => structuredClone(getDb()),
}

export type MockControl = typeof mockControl

declare global {
  interface Window {
    __mock?: MockControl
  }
}
