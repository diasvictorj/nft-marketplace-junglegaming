import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { AddCartItemRequest, Cart, Network, Quote } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'
import { useSession } from '@/features/auth/hooks/useSession'

export const cartQueryOptions = (ownerId: string) =>
  queryOptions({
    queryKey: qk.cart(ownerId),
    queryFn: async ({ signal }) => (await http.get<Cart>('/cart', { signal })).data,
    staleTime: 10_000,
  })

export function useCart() {
  const { ownerId, isPending } = useSession()
  return useQuery({ ...cartQueryOptions(ownerId), enabled: !isPending })
}

/** Cotação do servidor: subtotal, desconto, taxa e total. A UI nunca recalcula valores. */
export const quoteQueryOptions = (ownerId: string, network: Network, cartVersion: number) =>
  queryOptions({
    queryKey: qk.quote(ownerId, network, cartVersion),
    queryFn: async ({ signal }) => (await http.post<Quote>('/quote', { network }, { signal })).data,
    staleTime: 60_000,
  })

export function useQuote(network: Network, cart: Cart | undefined) {
  const { ownerId } = useSession()
  return useQuery({
    ...quoteQueryOptions(ownerId, network, cart?.version ?? -1),
    enabled: !!cart && cart.lines.length > 0,
  })
}

type LineRef = { nftId: string; editionId: string }

/** Mutations do carrinho: a resposta é o carrinho atualizado; cotações são invalidadas. */
export function useCartMutations() {
  const queryClient = useQueryClient()
  const { ownerId } = useSession()
  const onSuccess = (cart: Cart) => {
    queryClient.setQueryData(qk.cart(ownerId), cart)
    void queryClient.invalidateQueries({ queryKey: qk.quotes(ownerId) })
  }
  const path = ({ nftId, editionId }: LineRef) => `/cart/items/${encodeURIComponent(nftId)}/${encodeURIComponent(editionId)}`

  return {
    add: useMutation({
      mutationFn: async (body: AddCartItemRequest) => (await http.post<Cart>('/cart/items', body)).data,
      onSuccess,
    }),
    setQuantity: useMutation({
      mutationFn: async ({ quantity, ...ref }: LineRef & { quantity: number }) => (await http.patch<Cart>(path(ref), { quantity })).data,
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (ref: LineRef) => (await http.delete<Cart>(path(ref))).data,
      onSuccess,
    }),
    applyCoupon: useMutation({
      mutationFn: async (code: string) => (await http.put<Cart>('/cart/coupon', { code })).data,
      onSuccess,
    }),
    removeCoupon: useMutation({
      mutationFn: async () => (await http.delete<Cart>('/cart/coupon')).data,
      onSuccess,
    }),
    acknowledge: useMutation({
      mutationFn: async () => (await http.post<Cart>('/cart/acknowledge')).data,
      onSuccess,
    }),
  }
}
