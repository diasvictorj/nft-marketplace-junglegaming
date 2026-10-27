import type { CreateOrderRequest, Network, Order } from '@/lib/api/contracts'
import { fingerprint, toHex } from '../db/crypto'
import { getDb, getScenario, mutate, onReset } from '../db/store'
import type { DbOrder } from '../db/types'
import { fail, validation, type Auth } from '../handlers/http'
import { emitNftUpdated, emitOrderUpdated } from '../socket'
import { computeQuote, getCartRecord } from './commerce'

/**
 * Pedidos: criação idempotente, revalidação da cotação e liquidação simulada.
 * O resultado do pagamento chega por `order.updated` e também é visível via REST
 * (liquidação "preguiçosa" na consulta, para sobreviver a refresh/reconexão).
 */

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const timers = new Map<string, ReturnType<typeof setTimeout>>()

onReset(() => {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
})

export function toOrderDto(order: DbOrder): Order {
  const { userId: _u, ownerKey: _o, settleAt: _s, idempotencyKey: _k, ...dto } = order
  return structuredClone(dto)
}

function validateCollector(body: CreateOrderRequest) {
  const c = body.collector ?? ({} as CreateOrderRequest['collector'])
  const errors: Record<string, string> = {}
  if (!c.displayName?.trim()) errors.displayName = 'Informe o nome de exibição'
  if (!c.username?.trim()) errors.username = 'Informe o nome de usuário'
  if (!c.profileName?.trim()) errors.profileName = 'Informe o nome do perfil'
  if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errors.email = 'E-mail inválido'
  if (!c.referralCode?.trim()) errors.referralCode = 'Informe o código de indicação'
  if (!NETWORKS.includes(body.network)) errors.network = 'Selecione uma rede'
  if (!body.walletId) errors.walletId = 'Selecione uma carteira'
  if (Object.keys(errors).length) throw validation(errors)
}

export interface CreateOrderResult {
  order: Order
  replayed: boolean
  /** Atraso artificial a aplicar antes de responder (cenário order-timeout). */
  responseDelayMs: number
}

export function createOrder(auth: Auth, key: string | null, body: CreateOrderRequest): CreateOrderResult {
  if (!key || key.length < 8) throw fail(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
  const db = getDb()
  const payloadHash = fingerprint(body)
  const previous = db.idempotency[key]
  if (previous) {
    if (previous.userId !== auth.user.id || previous.payloadHash !== payloadHash) {
      throw fail(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.')
    }
    const existing = db.orders.find((o) => o.id === previous.orderId)!
    settleIfDue(existing)
    return { order: toOrderDto(existing), replayed: true, responseDelayMs: 0 }
  }

  validateCollector(body)
  const wallet = db.wallets.find((w) => w.id === body.walletId && w.userId === auth.user.id)
  if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
  if (!auth.session.connectedWallets.includes(wallet.id)) {
    throw fail(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de confirmar a compra.')
  }

  const ownerKey = `user:${auth.user.id}`
  const stored = db.quotes[body.quoteId]
  if (!stored || stored.ownerKey !== ownerKey) throw fail(404, 'NOT_FOUND', 'Cotação não encontrada. Atualize o resumo.')
  // Revalida preço, disponibilidade, cupom e taxas contra o estado atual.
  const fresh = computeQuote(ownerKey, body.network)
  if (Date.parse(stored.expiresAt) < Date.now()) {
    throw fail(409, 'QUOTE_EXPIRED', 'A cotação expirou. Revise os novos valores.', { details: { quote: saveQuote(fresh, ownerKey) } })
  }
  if (fresh.blocked) {
    throw fail(409, 'AVAILABILITY_CONFLICT', 'Um ou mais itens não estão mais disponíveis na quantidade escolhida.', {
      details: { quote: saveQuote(fresh, ownerKey) },
    })
  }
  if (fresh.hash !== body.quoteHash || stored.hash !== body.quoteHash) {
    throw fail(409, 'QUOTE_CHANGED', 'Os valores do pedido mudaram. Revise e confirme novamente.', {
      details: { quote: saveQuote(fresh, ownerKey) },
    })
  }

  const s = getScenario()
  const now = Date.now()
  const order = mutate((d) => {
    const o: DbOrder = {
      id: `ord_${++d.seq.order}`,
      status: 'pending',
      transactionRef: null,
      explorerUrl: null,
      declineReason: null,
      quote: structuredClone(stored),
      wallet: { id: wallet.id, label: wallet.label, address: wallet.address, provider: wallet.provider },
      network: body.network,
      collector: body.collector,
      version: 1,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      userId: auth.user.id,
      ownerKey,
      settleAt: now + s.settleDelayMs,
      idempotencyKey: key,
    }
    // O snapshot não carrega o ownerKey interno da cotação.
    delete (o.quote as { ownerKey?: string }).ownerKey
    d.orders.push(o)
    d.idempotency[key] = { userId: auth.user.id, payloadHash, orderId: o.id }
    return o
  })
  scheduleSettlement(order)
  return { order: toOrderDto(order), replayed: false, responseDelayMs: s.orderResponseDelayMs ?? 0 }
}

function saveQuote(quote: ReturnType<typeof computeQuote>, ownerKey: string) {
  mutate((d) => {
    d.quotes[quote.id] = { ...quote, ownerKey }
  })
  return quote
}

export function scheduleSettlement(order: DbOrder) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const wait = Math.max(0, order.settleAt - Date.now())
  timers.set(
    order.id,
    setTimeout(() => {
      timers.delete(order.id)
      const current = getDb().orders.find((o) => o.id === order.id)
      if (current) settle(current)
    }, wait),
  )
}

/** Liquida pedidos cujo prazo passou (ex.: a aba foi recarregada no meio). */
export function settleIfDue(order: DbOrder) {
  if (order.status === 'pending' && order.settleAt <= Date.now()) settle(order)
  else scheduleSettlement(order)
}

function settle(order: DbOrder) {
  if (order.status !== 'pending') return // estados terminais não mudam
  const s = getScenario()
  const db = getDb()
  let outcome = s.paymentOutcome
  let reason: string | null = outcome === 'declined' ? 'Pagamento recusado pela carteira (simulação).' : null
  // Garante disponibilidade no momento da liquidação.
  for (const line of order.quote.lines) {
    const edition = db.nfts.find((n) => n.id === line.nftId)?.editions.find((e) => e.id === line.editionId)
    if (!edition || edition.available < line.quantity) {
      outcome = 'declined'
      reason = `A edição ${line.editionLabel} de ${line.title} esgotou antes da confirmação.`
    }
  }
  const touched = new Set<string>()
  mutate(() => {
    order.status = outcome
    order.version++
    order.updatedAt = new Date().toISOString()
    if (outcome === 'confirmed') {
      const ref = `0x${toHex(crypto.getRandomValues(new Uint8Array(32)))}`
      order.transactionRef = ref
      order.explorerUrl = `https://sepolia.etherscan.io/tx/${ref}`
      for (const line of order.quote.lines) {
        const nft = db.nfts.find((n) => n.id === line.nftId)!
        const edition = nft.editions.find((e) => e.id === line.editionId)!
        if (edition.supply !== null) edition.available -= line.quantity
        else edition.available = Math.max(0, edition.available - line.quantity)
        nft.version++
        touched.add(nft.id)
      }
      // Remove do carrinho apenas os itens e quantidades comprados.
      const cart = getCartRecord(order.ownerKey)
      for (const line of order.quote.lines) {
        const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
        if (!item) continue
        item.quantity -= line.quantity
      }
      cart.items = cart.items.filter((i) => i.quantity > 0)
      cart.couponCode = cart.items.length ? cart.couponCode : null
      cart.version++
    } else {
      order.declineReason = reason
    }
  })
  emitOrderUpdated(order.userId, toOrderDto(order))
  for (const id of touched) emitNftUpdated(db.nfts.find((n) => n.id === id)!)
}

export function getOrderFor(auth: Auth, id: string): Order {
  const order = getDb().orders.find((o) => o.id === id)
  if (!order) throw fail(404, 'NOT_FOUND', 'Pedido não encontrado.')
  if (order.userId !== auth.user.id) throw fail(403, 'FORBIDDEN', 'Você não tem acesso a este pedido.')
  settleIfDue(order)
  return toOrderDto(order)
}

export function listOrdersFor(auth: Auth, status?: string | null): Order[] {
  return getDb()
    .orders.filter((o) => o.userId === auth.user.id)
    .map((o) => {
      settleIfDue(o)
      return o
    })
    .filter((o) => !status || o.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toOrderDto)
}

/** Reagenda liquidações pendentes ao iniciar os mocks (após refresh). */
export function resumePendingSettlements() {
  for (const o of getDb().orders) if (o.status === 'pending') scheduleSettlement(o)
}
