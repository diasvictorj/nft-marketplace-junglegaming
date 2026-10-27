/**
 * Cenários determinísticos e configuráveis. Selecionados por:
 *  1. query string  ?scenario=<id>  (útil em demo e Playwright; persiste no localStorage)
 *  2. localStorage  mock:scenario
 *  3. VITE_MOCK_SCENARIO
 * Trocar de cenário (painel de mocks ou window.__mock.setScenario) reseta o estado simulado.
 */
import type { ApiErrorCode } from '@/lib/api/contracts'

export type ScenarioId =
  | 'success'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'out-of-order'
  | 'network-down'
  | 'http-4xx'
  | 'http-5xx'
  | 'session-expired'
  | 'unauthorized'
  | 'signup-conflict'
  | 'coupon-invalid'
  | 'coupon-expired'
  | 'price-changed'
  | 'sold-out'
  | 'order-timeout'
  | 'wallet-rejected'
  | 'payment-confirmed'
  | 'payment-declined'

/** Falha injetada em requisições que casam com `method` + `path`. */
export interface Fault {
  method: string | '*'
  /** Regex aplicada ao pathname sem o prefixo /api. */
  path: RegExp
  kind: 'network' | 'http'
  status?: number
  code?: ApiErrorCode
  /** Quantas vezes falhar antes de passar a responder normalmente (Infinity = sempre). */
  times: number
}

export interface ScenarioConfig {
  id: ScenarioId
  description: string
  /** Latência base (ms) e jitter; o jitter usa PRNG com seed (reproduzível). */
  latencyMs: number
  jitterMs: number
  seed: number
  /** Inverte a ordem de chegada de requisições consecutivas do catálogo. */
  outOfOrder?: boolean
  faults?: Fault[]
  /** Duração (ms) da sessão após login. */
  sessionTtlMs: number
  /** Tempo até o pagamento ser liquidado e o resultado. */
  settleDelayMs: number
  paymentOutcome: 'confirmed' | 'declined'
  /** Atraso extra na 1ª resposta de cada chave de idempotência (provoca timeout). */
  orderResponseDelayMs?: number
  /** Mutação aplicada ao NFT do carrinho alguns segundos após a cotação. */
  catalogDrift?: 'price' | 'sold-out'
  catalogDriftDelayMs?: number
  catalogEmpty?: boolean
  signupAlwaysConflicts?: boolean
  couponOverride?: 'COUPON_INVALID' | 'COUPON_EXPIRED'
  walletRejects?: boolean
  forbidPrivate?: boolean
}

const base = {
  latencyMs: 120,
  jitterMs: 0,
  seed: 42,
  sessionTtlMs: 2 * 60 * 60_000,
  settleDelayMs: 2500,
  paymentOutcome: 'confirmed' as const,
}

const ALL = /.*/

export const scenarios: Record<ScenarioId, ScenarioConfig> = {
  success: { id: 'success', description: 'Fluxo feliz', ...base },
  empty: { id: 'empty', description: 'Catálogo sem resultados', ...base, catalogEmpty: true },
  slow: { id: 'slow', description: 'Respostas lentas (2,5 s)', ...base, latencyMs: 2500 },
  'variable-latency': {
    id: 'variable-latency',
    description: 'Latência variável (100–1600 ms, seed fixa)',
    ...base,
    latencyMs: 100,
    jitterMs: 1500,
  },
  'out-of-order': {
    id: 'out-of-order',
    description: 'Respostas do catálogo chegam fora de ordem',
    ...base,
    outOfOrder: true,
  },
  'network-down': {
    id: 'network-down',
    description: 'Sem conexão com a API',
    ...base,
    faults: [{ method: '*', path: ALL, kind: 'network', times: Infinity }],
  },
  'http-4xx': {
    id: 'http-4xx',
    description: 'Mutations de favoritos respondem 400',
    ...base,
    faults: [
      { method: 'POST', path: /^\/favorites/, kind: 'http', status: 400, code: 'VALIDATION_ERROR', times: Infinity },
      { method: 'DELETE', path: /^\/favorites/, kind: 'http', status: 400, code: 'VALIDATION_ERROR', times: Infinity },
    ],
  },
  'http-5xx': {
    id: 'http-5xx',
    description: 'Catálogo falha 3× com 503 (esgota retries) e favoritos sempre 503',
    ...base,
    faults: [
      { method: 'GET', path: /^\/nfts$/, kind: 'http', status: 503, code: 'TRANSIENT_FAILURE', times: 3 },
      { method: 'POST', path: /^\/favorites/, kind: 'http', status: 503, code: 'TRANSIENT_FAILURE', times: Infinity },
      { method: 'DELETE', path: /^\/favorites/, kind: 'http', status: 503, code: 'TRANSIENT_FAILURE', times: Infinity },
    ],
  },
  'session-expired': {
    id: 'session-expired',
    description: 'Sessão expira 20 s após o login',
    ...base,
    sessionTtlMs: 20_000,
  },
  unauthorized: {
    id: 'unauthorized',
    description: 'Perfil e carteiras respondem 403',
    ...base,
    forbidPrivate: true,
  },
  'signup-conflict': {
    id: 'signup-conflict',
    description: 'Todo cadastro responde 409 (e-mail em uso)',
    ...base,
    signupAlwaysConflicts: true,
  },
  'coupon-invalid': { id: 'coupon-invalid', description: 'Qualquer cupom é inválido', ...base, couponOverride: 'COUPON_INVALID' },
  'coupon-expired': { id: 'coupon-expired', description: 'Qualquer cupom está expirado', ...base, couponOverride: 'COUPON_EXPIRED' },
  'price-changed': {
    id: 'price-changed',
    description: 'Preço do 1º item do carrinho sobe 4 s após a cotação',
    ...base,
    catalogDrift: 'price',
    catalogDriftDelayMs: 4000,
  },
  'sold-out': {
    id: 'sold-out',
    description: 'Edição do 1º item do carrinho esgota 4 s após a cotação',
    ...base,
    catalogDrift: 'sold-out',
    catalogDriftDelayMs: 4000,
  },
  'order-timeout': {
    id: 'order-timeout',
    description: 'Pedido é criado mas a 1ª resposta excede o timeout (recupera por idempotência)',
    ...base,
    orderResponseDelayMs: 9000,
  },
  'wallet-rejected': { id: 'wallet-rejected', description: 'Carteira recusa a conexão', ...base, walletRejects: true },
  'payment-confirmed': { id: 'payment-confirmed', description: 'Pagamento confirmado', ...base },
  'payment-declined': {
    id: 'payment-declined',
    description: 'Pagamento recusado',
    ...base,
    paymentOutcome: 'declined',
  },
}

const STORAGE_KEY = 'mock:scenario'

export function isScenarioId(id: string | null | undefined): id is ScenarioId {
  return !!id && id in scenarios
}

/** Lê o cenário inicial. `?scenario=` tem prioridade e é persistido. */
export function resolveScenario(fallback: string): { config: ScenarioConfig; fromUrl: boolean } {
  let fromUrl: string | null = null
  let stored: string | null = null
  try {
    fromUrl = new URLSearchParams(window.location.search).get('scenario')
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* storage indisponível */
  }
  if (isScenarioId(fromUrl)) {
    persistScenario(fromUrl)
    return { config: scenarios[fromUrl], fromUrl: fromUrl !== stored }
  }
  const id = isScenarioId(stored) ? stored : isScenarioId(fallback) ? fallback : 'success'
  return { config: scenarios[id], fromUrl: false }
}

export function persistScenario(id: ScenarioId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* noop */
  }
}
