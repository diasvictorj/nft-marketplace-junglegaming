import type { CartItem, EthString, Network, Nft, Order, Quote, User, Wallet } from '@/lib/api/contracts'

export interface DbUser extends User {
  salt: string
  passwordHash: string
}
export interface DbSession {
  token: string
  sessionId: string
  userId: string
  expiresAt: number
  /** Carteiras conectadas (simulação) nesta sessão. */
  connectedWallets: string[]
}
export interface DbCartItem extends CartItem {
  seenUnitPrice: EthString
}
export interface DbCart {
  items: DbCartItem[]
  couponCode: string | null
  version: number
}
export interface DbQuote extends Quote {
  ownerKey: string
}
export interface DbOrder extends Order {
  userId: string
  ownerKey: string
  settleAt: number
  idempotencyKey: string
}
export interface DbWallet extends Omit<Wallet, 'connected'> {
  userId: string
}
export interface DbCoupon {
  code: string
  kind: 'percent' | 'fixed'
  value: string
  expiresAt: string
}
export interface Db {
  schema: number
  users: DbUser[]
  sessions: DbSession[]
  nfts: Nft[]
  favorites: Record<string, string[]>
  /** Chave: `user:<id>` ou `guest:<cartId>`. */
  carts: Record<string, DbCart>
  quotes: Record<string, DbQuote>
  orders: DbOrder[]
  idempotency: Record<string, { userId: string; payloadHash: string; orderId: string }>
  wallets: DbWallet[]
  coupons: DbCoupon[]
  flags: { driftApplied: boolean }
  seq: { order: number; quote: number; wallet: number; user: number }
}

export type { Network }
