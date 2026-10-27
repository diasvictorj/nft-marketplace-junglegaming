import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'
import type { Cart, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, Page } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'
import { formatEth } from '@/lib/money/eth'
import { useSession } from '@/features/auth/hooks/useSession'
import { connectSocket, disconnectSocket } from './socket'
import { setRealtimeStatus } from './status'

/**
 * Liga o Socket.IO ao cache do TanStack Query.
 *
 * Regras (ARCHITECTURE.md › Eventos):
 *  - deduplica por `eventId` e descarta `version` <= à conhecida (nunca regride estado);
 *  - ignora eventos privados de outra sessão (`sessionId`);
 *  - após reconexão, reconcilia os recursos ativos refazendo as consultas REST;
 *  - a conexão pertence à sessão: trocar de usuário/logout encerra o socket e seus listeners.
 */
export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const { session, ownerId } = useSession()
  const token = session?.token ?? null
  const sessionId = session?.sessionId ?? null
  const userId = session?.user.id ?? null
  const ownerRef = useRef(ownerId)
  ownerRef.current = ownerId

  useEffect(() => {
    // Adia a conexão um tick: no double-mount do StrictMode o primeiro efeito é
    // descartado antes de abrir um socket que ficaria órfão no servidor simulado.
    let socket: Socket | null = null
    let disposed = false
    const timer = setTimeout(() => {
      void connectSocket(token).then((s) => {
        if (disposed) return s.disconnect()
        socket = s
        wire(s)
      })
    }, 0)
    const seen = new Set<string>()
    const versions = new Map<string, number>()
    let connectedOnce = false
    setRealtimeStatus('connecting')

    const isNew = (eventId: string, key: string, version: number, cachedVersion = 0) => {
      if (seen.has(eventId)) return false
      seen.add(eventId)
      if (seen.size > 500) seen.delete(seen.values().next().value!)
      const known = Math.max(versions.get(key) ?? 0, cachedVersion)
      if (version <= known) return false
      versions.set(key, version)
      return true
    }

    const wire = (socket: Socket) => {
      socket.on('connect', () => {
        setRealtimeStatus('connected')
        if (connectedOnce) reconcile(queryClient, userId)
        connectedOnce = true
      })
      socket.on('disconnect', () => setRealtimeStatus('reconnecting'))

      socket.on('nft.updated', (event: NftUpdatedEvent) => {
        if (event.sessionId !== null && event.sessionId !== sessionId) return
        const nft = event.payload.nft
        const cached = queryClient.getQueryData<Nft>(qk.nfts.detail(nft.id))
        if (!isNew(event.eventId, `nft:${nft.id}`, event.version, cached?.version)) return
        applyNftUpdate(queryClient, nft, ownerRef.current)
      })

      socket.on('order.updated', (event: OrderUpdatedEvent) => {
        // Eventos privados só valem para a sessão que os recebeu.
        if (!userId || event.sessionId !== sessionId) return
        const order = event.payload.order
        const key = qk.orders.detail(userId, order.id)
        const cached = queryClient.getQueryData<Order>(key)
        if (!isNew(event.eventId, `order:${order.id}`, event.version, cached?.version)) return
        queryClient.setQueryData(key, order)
        void queryClient.invalidateQueries({ queryKey: qk.orders.pending(userId) })
        if (order.status === 'confirmed') {
          void queryClient.invalidateQueries({ queryKey: qk.cart(userId) })
          void queryClient.invalidateQueries({ queryKey: qk.quotes(userId) })
        }
      })
    }

    return () => {
      disposed = true
      clearTimeout(timer)
      if (socket) disconnectSocket()
      setRealtimeStatus('idle')
    }
  }, [queryClient, token, sessionId, userId])

  return null
}

function applyNftUpdate(queryClient: QueryClient, nft: Nft, ownerId: string) {
  queryClient.setQueryData<Nft>(qk.nfts.detail(nft.id), (prev) => (!prev || prev.version < nft.version ? nft : prev))
  queryClient.setQueriesData<Page<Nft>>(
    { queryKey: qk.nfts.lists() },
    (page) =>
      page && {
        ...page,
        items: page.items.map((n) => (n.id === nft.id && n.version < nft.version ? nft : n)),
      },
  )
  void queryClient.invalidateQueries({ queryKey: qk.nfts.featured() })

  const cart = queryClient.getQueryData<Cart>(qk.cart(ownerId))
  const affected = cart?.lines.filter((l) => l.nftId === nft.id) ?? []
  if (!affected.length) return
  for (const line of affected) {
    const edition = nft.editions.find((e) => e.id === line.editionId)
    if (!edition) continue
    if (edition.price !== line.unitPrice) {
      toast.warning(`Preço atualizado: ${line.title} (${line.editionLabel})`, {
        id: `price-${line.editionId}`,
        description: `De ${formatEth(line.unitPrice)} para ${formatEth(edition.price)}. O resumo foi recalculado.`,
      })
    } else if (edition.available < line.quantity) {
      toast.warning(`Disponibilidade alterada: ${line.title} (${line.editionLabel})`, {
        id: `stock-${line.editionId}`,
        description: edition.available === 0 ? 'Esta edição esgotou.' : `Restam ${edition.available} unidade(s).`,
      })
    }
  }
  void queryClient.invalidateQueries({ queryKey: qk.cart(ownerId) })
  void queryClient.invalidateQueries({ queryKey: qk.quotes(ownerId) })
}

/** Após reconectar: os eventos perdidos são recuperados refazendo as consultas REST ativas. */
function reconcile(queryClient: QueryClient, userId: string | null) {
  void queryClient.invalidateQueries({ queryKey: qk.nfts.all() })
  void queryClient.invalidateQueries({ queryKey: ['cart'] })
  void queryClient.invalidateQueries({ queryKey: ['quote'] })
  if (userId) void queryClient.invalidateQueries({ queryKey: qk.orders.all(userId) })
}
