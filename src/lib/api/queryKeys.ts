import type { NftListParams } from './contracts'

/**
 * Fábrica de query keys. Dados privados SEMPRE incluem o userId, garantindo
 * isolamento entre usuários; os parâmetros da consulta fazem parte da key.
 */
export const qk = {
  session: () => ['session'] as const,
  nfts: {
    all: () => ['nfts'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  favorites: (userId: string) => ['user', userId, 'favorites'] as const,
  cart: (ownerId: string) => ['cart', ownerId] as const,
  quote: (ownerId: string, cartVersion: number) => ['quote', ownerId, cartVersion] as const,
  orders: {
    detail: (userId: string, orderId: string) => ['user', userId, 'orders', orderId] as const,
  },
  profile: (userId: string) => ['user', userId, 'profile'] as const,
  wallets: (userId: string) => ['user', userId, 'wallets'] as const,
}
