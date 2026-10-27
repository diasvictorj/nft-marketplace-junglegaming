import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { createOrder } from '@/features/orders/api/orders'
import { isApiError } from '@/lib/api/client'
import type { CreateOrderRequest, Order } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'
import { attemptFor, clearAttempt } from '../model/attempt'

/**
 * Envio do pedido. Proteções contra duplicidade:
 *  1. trava síncrona (ref) contra duplo clique antes do re-render;
 *  2. chave de idempotência persistida por conteúdo (reenvio = mesmo pedido).
 */
export function usePlaceOrder(userId: string) {
  const queryClient = useQueryClient()
  const inFlight = useRef(false)
  const mutation = useMutation({
    mutationFn: async (body: CreateOrderRequest) => {
      const attempt = attemptFor(userId, body)
      return createOrder(attempt.body, attempt.key)
    },
    onSuccess: (order: Order) => {
      clearAttempt()
      queryClient.setQueryData(qk.orders.detail(userId, order.id), order)
      void queryClient.invalidateQueries({ queryKey: qk.orders.pending(userId) })
    },
    // Erro definitivo (4xx): o pedido não existe; a próxima tentativa usa nova chave.
    // Timeout/rede/5xx mantêm a tentativa para reenvio com a mesma chave.
    onError: (e) => {
      if (isApiError(e) && !e.retryable) clearAttempt()
    },
    onSettled: () => {
      inFlight.current = false
    },
  })
  const place = (body: CreateOrderRequest, opts?: Parameters<typeof mutation.mutate>[1]) => {
    if (inFlight.current) return
    inFlight.current = true
    mutation.mutate(body, opts)
  }
  return { ...mutation, place }
}
