/**
 * Cenários determinísticos e configuráveis. Selecionados por:
 *  1. query string  ?scenario=<id>  (útil em demo e Playwright)
 *  2. localStorage  mock:scenario
 *  3. VITE_MOCK_SCENARIO
 * O reset restaura integralmente o estado conhecido (ver mocks/db).
 */
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
  | 'payment-confirmed'
  | 'payment-declined'

export interface ScenarioConfig {
  id: ScenarioId
  description: string
  /** Latência base (ms) e jitter; usados com seed para serem reproduzíveis. */
  latencyMs: number
  jitterMs: number
  seed: number
}

const base = { latencyMs: 150, jitterMs: 0, seed: 42 }

export const scenarios: Record<ScenarioId, ScenarioConfig> = {
  success: { id: 'success', description: 'Fluxo feliz', ...base },
  empty: { id: 'empty', description: 'Catálogo sem resultados', ...base },
  slow: { id: 'slow', description: 'Respostas lentas (3s)', ...base, latencyMs: 3000 },
  'variable-latency': { id: 'variable-latency', description: 'Latência variável', ...base, jitterMs: 1500 },
  'out-of-order': { id: 'out-of-order', description: 'Respostas fora de ordem', ...base, jitterMs: 2000 },
  'network-down': { id: 'network-down', description: 'Sem conexão', ...base },
  'http-4xx': { id: 'http-4xx', description: 'Erros HTTP 4xx', ...base },
  'http-5xx': { id: 'http-5xx', description: 'Erros HTTP 5xx', ...base },
  'session-expired': { id: 'session-expired', description: 'Sessão expira durante a navegação', ...base },
  unauthorized: { id: 'unauthorized', description: 'Acesso não autorizado', ...base },
  'signup-conflict': { id: 'signup-conflict', description: 'E-mail já cadastrado', ...base },
  'coupon-invalid': { id: 'coupon-invalid', description: 'Cupom inválido', ...base },
  'coupon-expired': { id: 'coupon-expired', description: 'Cupom expirado', ...base },
  'price-changed': { id: 'price-changed', description: 'Preço muda durante a compra', ...base },
  'sold-out': { id: 'sold-out', description: 'Edição esgota durante a compra', ...base },
  'order-timeout': { id: 'order-timeout', description: 'Timeout após criar pedido (idempotência)', ...base },
  'payment-confirmed': { id: 'payment-confirmed', description: 'Pagamento confirmado', ...base },
  'payment-declined': { id: 'payment-declined', description: 'Pagamento recusado', ...base },
}

const STORAGE_KEY = 'mock:scenario'

export function resolveScenario(fallback: string): ScenarioConfig {
  let id: string | null = null
  try {
    id = new URLSearchParams(window.location.search).get('scenario') ?? localStorage.getItem(STORAGE_KEY)
  } catch {
    /* storage indisponível */
  }
  const picked = (id ?? fallback) as ScenarioId
  return scenarios[picked] ?? scenarios.success
}

export function setScenario(id: ScenarioId) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* noop */
  }
}
