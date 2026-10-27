/**
 * Contratos REST compartilhados entre transporte (Axios), estado (TanStack Query),
 * mocks (MSW) e interface. Valores em ETH trafegam SEMPRE como string decimal.
 */

export type EthString = string // ex.: "0.125000000000000000"

/* ---------- Erros ---------- */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_SESSION'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'AVAILABILITY_CONFLICT'
  | 'PRICE_CHANGED'
  | 'QUOTE_CHANGED'
  | 'QUOTE_EXPIRED'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'EMAIL_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_REJECTED'
  | 'WALLET_NOT_CONNECTED'
  | 'PAYMENT_DECLINED'
  | 'TRANSIENT_FAILURE'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Erros por campo, para formulários. */
  fieldErrors?: Record<string, string>
  retryable?: boolean
  /** Dados extras do erro (ex.: nova cotação em QUOTE_CHANGED). */
  details?: { quote?: Quote }
}

/* ---------- Sessão e conta ---------- */
export interface User {
  id: string
  name: string
  username: string
  email: string
  /** Nome ENS sem o sufixo .eth (vazio = não definido). */
  ensName: string
  /** Apelido exibido para a carteira do colecionador. */
  walletNickname: string
  avatarUrl: string | null
}
export interface SessionResponse {
  user: User
  /** Token opaco enviado em `Authorization: Bearer`. */
  token: string
  /** Identificador público da sessão (presente nos eventos privados). */
  sessionId: string
  expiresAt: string
}
export interface LoginRequest {
  email: string
  password: string
}
export interface SignupRequest extends LoginRequest {
  username: string
  /** Opcional; quando ausente, o nome de exibição inicial é o nome de usuário. */
  name?: string
}

/* ---------- NFTs ---------- */
export type NftSort = 'recent' | 'price-asc' | 'price-desc' | 'name'
export type NftTab = 'all' | 'new' | 'trending'
export type Network = 'ethereum' | 'polygon' | 'solana'

export interface NftListParams {
  q?: string
  category?: string[]
  network?: string[]
  minPrice?: EthString
  maxPrice?: EthString
  sort: NftSort
  tab: NftTab
  /** Somente favoritos do usuário autenticado. */
  favorites?: boolean
  page: number
  pageSize: number
}
export interface Edition {
  id: string
  /** Rótulo exibido (1/1, 1/10, 1/50, Aberta). */
  label: string
  price: EthString
  supply: number | null
  available: number
}
export interface NftImage {
  /** Caminho base; a UI escolhe a variante (-thumb/-md/-lg).webp */
  src: string
  alt: string
}
export interface Nft {
  id: string
  tokenId: string
  title: string
  creator: string
  collection: string
  category: string
  network: Network
  description: string
  attributes: string[]
  images: NftImage[]
  editions: Edition[]
  /** Edição exibida por padrão (preço do card, ordenação e filtro de preço). */
  defaultEditionId: string
  /** Preço "de" exibido riscado no card, quando houver. */
  compareAtPrice: EthString | null
  rating: number
  reviewCount: number
  trending: boolean
  createdAt: string
  /** Versão monotônica, usada para ignorar eventos antigos. */
  version: number
}
export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
export interface FacetOption {
  id: string
  label: string
  count: number
}
export interface NftFacets {
  categories: FacetOption[]
  networks: FacetOption[]
  priceRange: { min: EthString; max: EthString }
}
export interface FeaturedResponse {
  hero: Nft
  spotlight: Nft
}

/* ---------- Favoritos ---------- */
export interface FavoritesResponse {
  nftIds: string[]
}

/* ---------- Carrinho e cotação ---------- */
export interface CartItem {
  nftId: string
  editionId: string
  quantity: number
}
export interface CartLine extends CartItem {
  title: string
  tokenId: string
  image: NftImage
  editionLabel: string
  unitPrice: EthString
  /** Preço visto quando o item foi adicionado/confirmado pela última vez. */
  seenUnitPrice: EthString
  available: number
}
export interface Cart {
  ownerId: string
  lines: CartLine[]
  couponCode: string | null
  itemCount: number
  version: number
}
export interface AddCartItemRequest extends CartItem {}
export interface QuoteRequest {
  network: Network
}
export type QuoteLineIssue = 'price-changed' | 'insufficient' | 'sold-out'
export interface QuoteLine extends CartLine {
  lineTotal: EthString
  issues: QuoteLineIssue[]
}
export interface Quote {
  id: string
  /** Impressão digital do conteúdo (preços, quantidades, cupom, taxa). */
  hash: string
  lines: QuoteLine[]
  network: Network
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  couponCode: string | null
  couponError: Extract<ApiErrorCode, 'COUPON_INVALID' | 'COUPON_EXPIRED'> | null
  /** true quando há linhas com problema que impedem o pedido. */
  blocked: boolean
  expiresAt: string
  createdAt: string
}

/* ---------- Pedidos ---------- */
export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export interface CollectorInfo {
  displayName: string
  username: string
  profileName: string
  email: string
  ensName: string
  referralCode: string
  note: string
}
export interface CreateOrderRequest {
  quoteId: string
  quoteHash: string
  walletId: string
  network: Network
  collector: CollectorInfo
}
export interface Order {
  id: string
  status: OrderStatus
  transactionRef: string | null
  explorerUrl: string | null
  declineReason: string | null
  /** Snapshot imutável: alterações no catálogo não o afetam. */
  quote: Quote
  wallet: Pick<Wallet, 'id' | 'label' | 'address' | 'provider'>
  network: Network
  collector: CollectorInfo
  version: number
  createdAt: string
  updatedAt: string
}

/* ---------- Perfil e carteiras ---------- */
export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
export interface Wallet {
  id: string
  label: string
  address: string
  network: Network
  provider: WalletProvider
  kind: 'primary' | 'secondary'
  /** Estado da conexão simulada para a sessão atual. */
  connected: boolean
}
export interface WalletInput {
  label: string
  address: string
  network: Network
  provider: WalletProvider
  kind: 'primary' | 'secondary'
}
export interface UpdateProfileRequest {
  name: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}
export interface UpdateAvatarRequest {
  /** data URL (image/png|jpeg|webp), até ~300 KB. */
  dataUrl: string | null
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
  /** Sessão destinatária; eventos de outra sessão são ignorados. null = público. */
  sessionId: string | null
  emittedAt: string
  payload: TPayload
}
export type NftUpdatedEvent = RealtimeEnvelope<'nft.updated', { nft: Nft }>
export type OrderUpdatedEvent = RealtimeEnvelope<'order.updated', { order: Order }>
export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
