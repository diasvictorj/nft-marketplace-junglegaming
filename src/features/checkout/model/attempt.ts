import type { CreateOrderRequest } from '@/lib/api/contracts'
import { readPrivate, removePrivate, writePrivate } from '@/lib/session/privateStorage'

/**
 * Tentativa de compra: a chave de idempotência é criada uma vez por conteúdo
 * (cotação + dados) e persistida. Cliques repetidos, reenvio após timeout ou
 * refresh reutilizam a MESMA chave → o servidor devolve o mesmo pedido.
 */
export interface CheckoutAttempt {
  key: string
  body: CreateOrderRequest
}

const KEY = 'checkout-attempt'

export function getAttempt(userId: string) {
  return readPrivate<CheckoutAttempt>(KEY, userId)
}

export function attemptFor(userId: string, body: CreateOrderRequest): CheckoutAttempt {
  const current = getAttempt(userId)
  if (current && JSON.stringify(current.body) === JSON.stringify(body)) return current
  const attempt = { key: `chk_${crypto.randomUUID()}`, body }
  writePrivate(KEY, userId, attempt)
  return attempt
}

export function clearAttempt() {
  removePrivate(KEY)
}

export const DRAFT_KEY = 'checkout-draft'
