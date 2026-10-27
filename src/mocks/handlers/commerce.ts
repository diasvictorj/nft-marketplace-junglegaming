import { delay } from 'msw'
import type { AddCartItemRequest, CreateOrderRequest, FavoritesResponse, Network, QuoteRequest } from '@/lib/api/contracts'
import { getDb, mutate } from '../db/store'
import {
  acknowledgePrices,
  addToCart,
  applyCoupon,
  createQuote,
  findNft,
  removeCoupon,
  removeFromCart,
  setCartQuantity,
  toCartDto,
} from '../domain/commerce'
import { createOrder, getOrderFor, listOrdersFor } from '../domain/orders'
import { cartOwner, created, fail, optionalAuth, readJson, requireAuth, route } from './http'

type LineParams = { nftId: string; editionId: string }
const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']

export const favoritesHandlers = [
  route('get', '/favorites', ({ request }) => {
    const { user } = requireAuth(request)
    return { nftIds: getDb().favorites[user.id] ?? [] } satisfies FavoritesResponse
  }),
  route('post', '/favorites', async ({ request }) => {
    const { user } = requireAuth(request)
    const { nftId } = await readJson<{ nftId: string }>(request)
    findNft(nftId)
    return mutate((db) => {
      const list = (db.favorites[user.id] ??= [])
      if (!list.includes(nftId)) list.push(nftId)
      return { nftIds: list } satisfies FavoritesResponse
    })
  }),
  route<{ nftId: string }>('delete', '/favorites/:nftId', ({ request, params }) => {
    const { user } = requireAuth(request)
    return mutate((db) => {
      const nftIds = (db.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
      db.favorites[user.id] = nftIds
      return { nftIds } satisfies FavoritesResponse
    })
  }),
]

export const cartHandlers = [
  route('get', '/cart', ({ request }) => toCartDto(cartOwner(request, optionalAuth(request)))),
  route('post', '/cart/items', async ({ request }) => {
    const owner = cartOwner(request, optionalAuth(request))
    const body = await readJson<AddCartItemRequest>(request)
    return addToCart(owner, body.nftId, body.editionId, body.quantity)
  }),
  route<LineParams>('patch', '/cart/items/:nftId/:editionId', async ({ request, params }) => {
    const owner = cartOwner(request, optionalAuth(request))
    const { quantity } = await readJson<{ quantity: number }>(request)
    return setCartQuantity(owner, params.nftId, params.editionId, quantity)
  }),
  route<LineParams>('delete', '/cart/items/:nftId/:editionId', ({ request, params }) =>
    removeFromCart(cartOwner(request, optionalAuth(request)), params.nftId, params.editionId),
  ),
  route('put', '/cart/coupon', async ({ request }) => {
    const owner = cartOwner(request, optionalAuth(request))
    const { code } = await readJson<{ code: string }>(request)
    return applyCoupon(owner, code)
  }),
  route('delete', '/cart/coupon', ({ request }) => removeCoupon(cartOwner(request, optionalAuth(request)))),
  route('post', '/cart/acknowledge', ({ request }) => acknowledgePrices(cartOwner(request, optionalAuth(request)))),

  route('post', '/quote', async ({ request }) => {
    const owner = cartOwner(request, optionalAuth(request))
    const { network } = await readJson<QuoteRequest>(request)
    if (!NETWORKS.includes(network)) throw fail(422, 'VALIDATION_ERROR', 'Rede inválida.', { fieldErrors: { network: 'Rede inválida' } })
    return createQuote(owner, network)
  }),
]

export const orderHandlers = [
  route('post', '/orders', async ({ request }) => {
    const auth = requireAuth(request)
    const body = await readJson<CreateOrderRequest>(request)
    const result = createOrder(auth, request.headers.get('idempotency-key'), body)
    // Cenário order-timeout: o pedido já existe, mas a resposta demora além do timeout do cliente.
    if (result.responseDelayMs) await delay(result.responseDelayMs)
    return result.replayed ? result.order : created(result.order)
  }),
  route('get', '/orders', ({ request, url }) => listOrdersFor(requireAuth(request), url.searchParams.get('status'))),
  route<{ id: string }>('get', '/orders/:id', ({ request, params }) => getOrderFor(requireAuth(request), params.id)),
]
