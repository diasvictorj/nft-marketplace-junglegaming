import type { Network, NftListParams } from './contracts'

/**
 * Fábrica de query keys. Dados privados ficam sob ['user', userId, ...] e o
 * carrinho/cotação sob o dono (userId ou 'guest'), garantindo isolamento entre
 * usuários; os parâmetros da consulta fazem parte da key.
 */
export const qk = {
  session: () => ['session'] as const,
  nfts: {
    all: () => ['nfts'] as const,
    lists: () => ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    facets: () => ['nfts', 'facets'] as const,
    featured: () => ['nfts', 'featured'] as const,
  },
  user: (userId: string) => ['user', userId] as const,
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  cart: (ownerId: string) => ['cart', ownerId] as const,
  quote: (ownerId: string, network: Network, cartVersion: number) => ['quote', ownerId, network, cartVersion] as const,
  quotes: (ownerId: string) => ['quote', ownerId] as const,
  orders: {
    all: (userId: string) => ['user', userId, 'orders'] as const,
    pending: (userId: string) => ['user', userId, 'orders', 'pending'] as const,
    detail: (userId: string, orderId: string) => ['user', userId, 'orders', 'detail', orderId] as const,
  },
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
}

/** Prefixos de dados privados, removidos no logout/troca de usuário/expiração. */
export const privateKeyPrefixes = [['user'], ['cart'], ['quote']] as const
