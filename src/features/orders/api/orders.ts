import { queryOptions } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { CreateOrderRequest, Order } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

/** Tempo limite do envio do pedido; o reenvio usa a MESMA chave de idempotência. */
export const ORDER_TIMEOUT_MS = 6000

export async function createOrder(body: CreateOrderRequest, idempotencyKey: string) {
  const { data } = await http.post<Order>('/orders', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
    timeout: ORDER_TIMEOUT_MS,
  })
  return data
}

/**
 * Pedido por id. Enquanto pendente, além do evento `order.updated`, há um polling
 * de segurança (fallback quando o socket está desconectado). Estados terminais param o polling.
 */
export const orderQueryOptions = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: qk.orders.detail(userId, orderId),
    queryFn: async ({ signal }) => (await http.get<Order>(`/orders/${encodeURIComponent(orderId)}`, { signal })).data,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4000 : false),
    staleTime: (query) => (query.state.data && query.state.data.status !== 'pending' ? Infinity : 0),
  })

export const pendingOrdersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.orders.pending(userId),
    queryFn: async ({ signal }) => (await http.get<Order[]>('/orders', { params: { status: 'pending' }, signal })).data,
  })
