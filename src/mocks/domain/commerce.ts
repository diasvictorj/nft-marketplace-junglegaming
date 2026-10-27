import Decimal from 'decimal.js'
import type { Cart, CartLine, Network, Nft, Quote, QuoteLine, QuoteLineIssue } from '@/lib/api/contracts'
import { fingerprint, randomId } from '../db/crypto'
import { getDb, getScenario, mutate } from '../db/store'
import type { DbCart, DbQuote } from '../db/types'
import { fail } from '../handlers/http'
import { emitNftUpdated } from '../socket'

/** Regras de negócio do carrinho e da cotação, compartilhadas pelos handlers. */

const eth = (v: Decimal.Value) => new Decimal(v).toFixed(18)
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.0021',
  solana: '0.0008',
}
const QUOTE_TTL_MS = 10 * 60_000

export function findNft(id: string): Nft {
  const nft = getDb().nfts.find((n) => n.id === id)
  if (!nft) throw fail(404, 'NOT_FOUND', 'NFT não encontrado.')
  return nft
}

export function findEdition(nft: Nft, editionId: string) {
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) throw fail(404, 'NOT_FOUND', 'Edição não encontrada.')
  return edition
}

export function getCartRecord(ownerKey: string): DbCart {
  const db = getDb()
  return (db.carts[ownerKey] ??= { items: [], couponCode: null, version: 0 })
}

function toLine(item: DbCart['items'][number]): CartLine | null {
  const nft = getDb().nfts.find((n) => n.id === item.nftId)
  const edition = nft?.editions.find((e) => e.id === item.editionId)
  if (!nft || !edition) return null
  return {
    nftId: item.nftId,
    editionId: item.editionId,
    quantity: item.quantity,
    title: nft.title,
    tokenId: nft.tokenId,
    image: nft.images[0]!,
    editionLabel: edition.label,
    unitPrice: edition.price,
    seenUnitPrice: item.seenUnitPrice,
    available: edition.available,
  }
}

export function toCartDto(ownerKey: string): Cart {
  const record = getCartRecord(ownerKey)
  const lines = record.items.map(toLine).filter((l): l is CartLine => l !== null)
  return {
    ownerId: ownerKey,
    lines,
    couponCode: record.couponCode,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    version: record.version,
  }
}

function assertQuantity(quantity: unknown): asserts quantity is number {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
    throw fail(422, 'VALIDATION_ERROR', 'Quantidade deve ser um número inteiro maior que zero.', {
      fieldErrors: { quantity: 'Quantidade inválida' },
    })
  }
}

export function addToCart(ownerKey: string, nftId: string, editionId: string, quantity: number) {
  assertQuantity(quantity)
  const nft = findNft(nftId)
  const edition = findEdition(nft, editionId)
  return mutate(() => {
    const cart = getCartRecord(ownerKey)
    const existing = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
    const next = (existing?.quantity ?? 0) + quantity
    if (edition.available === 0) throw fail(409, 'AVAILABILITY_CONFLICT', `A edição ${edition.label} de ${nft.title} está esgotada.`)
    if (next > edition.available) {
      throw fail(409, 'AVAILABILITY_CONFLICT', `Só há ${edition.available} unidade(s) disponível(is) da edição ${edition.label}.`)
    }
    if (existing) {
      existing.quantity = next
      existing.seenUnitPrice = edition.price
    } else {
      cart.items.push({ nftId, editionId, quantity, seenUnitPrice: edition.price })
    }
    cart.version++
    return toCartDto(ownerKey)
  })
}

export function setCartQuantity(ownerKey: string, nftId: string, editionId: string, quantity: number) {
  assertQuantity(quantity)
  const edition = findEdition(findNft(nftId), editionId)
  return mutate(() => {
    const cart = getCartRecord(ownerKey)
    const item = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
    if (!item) throw fail(404, 'NOT_FOUND', 'Item não está no carrinho.')
    if (quantity > edition.available) {
      throw fail(409, 'AVAILABILITY_CONFLICT', `Só há ${edition.available} unidade(s) disponível(is) da edição ${edition.label}.`)
    }
    item.quantity = quantity
    cart.version++
    return toCartDto(ownerKey)
  })
}

export function removeFromCart(ownerKey: string, nftId: string, editionId: string) {
  return mutate(() => {
    const cart = getCartRecord(ownerKey)
    const before = cart.items.length
    cart.items = cart.items.filter((i) => !(i.nftId === nftId && i.editionId === editionId))
    if (cart.items.length === before) throw fail(404, 'NOT_FOUND', 'Item não está no carrinho.')
    cart.version++
    return toCartDto(ownerKey)
  })
}

/** Usuário reconhece os novos preços exibidos (limpa o aviso de alteração). */
export function acknowledgePrices(ownerKey: string) {
  return mutate(() => {
    const cart = getCartRecord(ownerKey)
    for (const item of cart.items) {
      const line = toLine(item)
      if (line) item.seenUnitPrice = line.unitPrice
    }
    cart.version++
    return toCartDto(ownerKey)
  })
}

/** Mescla o carrinho do visitante no do usuário ao autenticar (respeitando disponibilidade). */
export function mergeGuestCart(guestKey: string | null, userKey: string) {
  if (!guestKey) return
  const db = getDb()
  const guest = db.carts[guestKey]
  if (!guest || guest.items.length === 0) return
  const user = getCartRecord(userKey)
  for (const item of guest.items) {
    const nft = db.nfts.find((n) => n.id === item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!edition) continue
    const existing = user.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
    const qty = Math.min((existing?.quantity ?? 0) + item.quantity, Math.max(edition.available, 1))
    if (existing) existing.quantity = qty
    else user.items.push({ ...item, quantity: qty })
  }
  user.couponCode ??= guest.couponCode
  user.version++
  delete db.carts[guestKey]
}

/* ---------- Cupons ---------- */
export function validateCoupon(code: string) {
  const override = getScenario().couponOverride
  if (override === 'COUPON_EXPIRED') throw fail(422, 'COUPON_EXPIRED', `O cupom ${code} expirou.`)
  if (override === 'COUPON_INVALID') throw fail(422, 'COUPON_INVALID', `O cupom ${code} não é válido.`)
  const coupon = getDb().coupons.find((c) => c.code === code.trim().toUpperCase())
  if (!coupon) throw fail(422, 'COUPON_INVALID', `O cupom ${code} não é válido.`)
  if (Date.parse(coupon.expiresAt) < Date.now()) throw fail(422, 'COUPON_EXPIRED', `O cupom ${coupon.code} expirou.`)
  return coupon
}

export function applyCoupon(ownerKey: string, code: string) {
  if (typeof code !== 'string' || !code.trim()) {
    throw fail(422, 'VALIDATION_ERROR', 'Informe um cupom.', { fieldErrors: { code: 'Informe um cupom' } })
  }
  const coupon = validateCoupon(code)
  return mutate(() => {
    const cart = getCartRecord(ownerKey)
    cart.couponCode = coupon.code
    cart.version++
    return toCartDto(ownerKey)
  })
}

export function removeCoupon(ownerKey: string) {
  return mutate(() => {
    const cart = getCartRecord(ownerKey)
    cart.couponCode = null
    cart.version++
    return toCartDto(ownerKey)
  })
}

/* ---------- Cotação ---------- */
export function computeQuote(ownerKey: string, network: Network): Quote {
  const cart = toCartDto(ownerKey)
  const lines: QuoteLine[] = cart.lines.map((l) => {
    const issues: QuoteLineIssue[] = []
    if (!new Decimal(l.unitPrice).eq(l.seenUnitPrice)) issues.push('price-changed')
    if (l.available === 0) issues.push('sold-out')
    else if (l.quantity > l.available) issues.push('insufficient')
    return { ...l, lineTotal: eth(new Decimal(l.unitPrice).times(l.quantity)), issues }
  })
  const subtotal = lines.reduce((acc, l) => acc.plus(l.lineTotal), new Decimal(0))

  let discount = new Decimal(0)
  let couponError: Quote['couponError'] = null
  if (cart.couponCode) {
    try {
      const coupon = validateCoupon(cart.couponCode)
      discount = coupon.kind === 'percent' ? subtotal.times(coupon.value).div(100) : Decimal.min(subtotal, coupon.value)
      discount = discount.toDecimalPlaces(6, Decimal.ROUND_DOWN)
    } catch (e) {
      couponError = (e as { body?: { code?: string } }).body?.code === 'COUPON_EXPIRED' ? 'COUPON_EXPIRED' : 'COUPON_INVALID'
    }
  }
  const fee = lines.length ? new Decimal(NETWORK_FEES[network]) : new Decimal(0)
  const total = subtotal.minus(discount).plus(fee)
  const content = {
    lines: lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice, l.available >= l.quantity]),
    coupon: cart.couponCode,
    discount: eth(discount),
    fee: eth(fee),
    network,
  }
  const now = Date.now()
  return {
    id: randomId('qt'),
    hash: fingerprint(content),
    lines,
    network,
    subtotal: eth(subtotal),
    discount: eth(discount),
    networkFee: eth(fee),
    total: eth(total),
    couponCode: cart.couponCode,
    couponError,
    blocked: lines.length === 0 || lines.some((l) => l.issues.includes('sold-out') || l.issues.includes('insufficient')),
    expiresAt: new Date(now + QUOTE_TTL_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
  }
}

export function createQuote(ownerKey: string, network: Network): Quote {
  const quote = computeQuote(ownerKey, network)
  mutate((db) => {
    db.quotes[quote.id] = { ...quote, ownerKey } satisfies DbQuote
    // Mantém apenas as cotações mais recentes.
    const ids = Object.keys(db.quotes)
    for (const id of ids.slice(0, Math.max(0, ids.length - 40))) delete db.quotes[id]
  })
  scheduleCatalogDrift(quote)
  return quote
}

/* ---------- Alterações do catálogo (eventos nft.updated) ---------- */
export function updateNft(nftId: string, patch: (nft: Nft) => void) {
  const nft = mutate(() => {
    const target = findNft(nftId)
    patch(target)
    target.version++
    return target
  })
  emitNftUpdated(nft)
  return nft
}

/** Cenários price-changed/sold-out: altera o 1º item cotado alguns segundos depois. */
function scheduleCatalogDrift(quote: Quote) {
  const s = getScenario()
  const first = quote.lines[0]
  if (!s.catalogDrift || !first || getDb().flags.driftApplied) return
  mutate((db) => {
    db.flags.driftApplied = true
  })
  setTimeout(() => {
    updateNft(first.nftId, (nft) => {
      const edition = nft.editions.find((e) => e.id === first.editionId)
      if (!edition) return
      if (s.catalogDrift === 'price') edition.price = new Decimal(edition.price).times(1.1).toDecimalPlaces(4).toFixed(18)
      else edition.available = 0
    })
  }, s.catalogDriftDelayMs ?? 4000)
}
