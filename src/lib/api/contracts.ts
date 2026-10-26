/**
 * Contratos REST compartilhados entre transporte (Axios), estado (TanStack Query),
 * mocks (MSW) e interface. Valores em ETH trafegam SEMPRE como string decimal.
 */

export type EthString = string // ex.: "0.125000000000000000"

/* ---------- Erros ---------- */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_SESSION'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'AVAILABILITY_CONFLICT'
  | 'PRICE_CHANGED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'EMAIL_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'PAYMENT_DECLINED'
  | 'TRANSIENT_FAILURE'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Erros por campo, para formulários. */
  fieldErrors?: Record<string, string>
  retryable?: boolean
}

/* ---------- Sessão e conta ---------- */
export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}
export interface SessionResponse {
  user: User
  expiresAt: string
}
export interface LoginRequest {
  email: string
  password: string
}
export interface SignupRequest extends LoginRequest {
  name: string
}

/* ---------- NFTs ---------- */
export type NftSort = 'relevance' | 'price-asc' | 'price-desc' | 'newest'

export interface NftListParams {
  q?: string
  category?: string
  minPrice?: EthString
  maxPrice?: EthString
  sort?: NftSort
  page: number
  pageSize: number
}
export interface Edition {
  id: string
  label: string
  price: EthString
  available: number
}
export interface Nft {
  id: string
  title: string
  creator: string
  category: string
  description: string
  images: { url: string; alt: string }[]
  editions: Edition[]
  /** Versão monotônica, usada para ignorar eventos antigos. */
  version: number
}
export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

/* ---------- Carrinho e cotação ---------- */
export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
}
export interface Cart {
  items: CartItem[]
  couponCode: string | null
  version: number
}
export interface QuoteLine extends CartItem {
  unitPrice: EthString
  lineTotal: EthString
  available: number
}
export interface Quote {
  id: string
  lines: QuoteLine[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  couponCode: string | null
  expiresAt: string
  version: number
}

/* ---------- Pedidos ---------- */
export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export interface CreateOrderRequest {
  quoteId: string
  walletId: string
  network: string
  collector: { name: string; email: string }
}
export interface Order {
  id: string
  status: OrderStatus
  transactionRef: string | null
  explorerUrl: string | null
  /** Snapshot imutável: alterações no catálogo não o afetam. */
  quote: Quote
  version: number
  createdAt: string
}

/* ---------- Perfil e carteiras ---------- */
export interface Wallet {
  id: string
  label: string
  address: string
  network: string
  kind: 'primary' | 'secondary'
}
export interface UpdateProfileRequest {
  name: string
  email: string
}
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

/* ---------- Eventos Socket.IO ---------- */
export interface RealtimeEnvelope<TType extends string, TPayload> {
  /** Identidade estável do evento (deduplicação). */
  eventId: string
  type: TType
  /** Recurso afetado. */
  resource: { kind: 'nft' | 'order'; id: string }
  /** Versão do recurso; eventos com versão <= à conhecida são descartados. */
  version: number
  /** Sessão destinatária; eventos de outra sessão são ignorados. */
  sessionId: string | null
  payload: TPayload
}
export type NftUpdatedEvent = RealtimeEnvelope<'nft.updated', { nft: Nft }>
export type OrderUpdatedEvent = RealtimeEnvelope<'order.updated', { order: Order }>
