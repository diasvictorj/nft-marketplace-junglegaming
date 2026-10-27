import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, RealtimeEvent } from '@/lib/api/contracts'
import { env } from '@/lib/env'
import { getDb } from '../db/store'

/**
 * Servidor Socket.IO simulado via MSW (ws.link + @mswjs/socket.io-binding).
 * O app usa o `socket.io-client` real; só o transporte WebSocket é interceptado.
 *
 * Limitações (também em ARCHITECTURE.md): apenas WebSocket (sem long-polling),
 * sem rooms/namespaces/broadcast nativos — o registro de conexões abaixo faz o
 * roteamento manualmente. O binding não envia heartbeats, então o servidor
 * simulado emite pings do Engine.IO para o cliente não encerrar a conexão.
 * O MSW 3 não intercepta URLs WebSocket com barra final; por isso o cliente usa
 * `addTrailingSlash: false` (…/socket.io?EIO=4…).
 */
export const socketServer = ws.link(`${env.socketUrl}/socket.io`)

interface Connection {
  io: ReturnType<typeof toSocketIo>
  close: () => void
  userId: string | null
  sessionId: string | null
}

const connections = new Set<Connection>()
const eventLog: { envelope: RealtimeEvent; target: string | null }[] = []
let blockedUntil = 0

function log(envelope: RealtimeEvent, target: string | null) {
  eventLog.push({ envelope, target })
  if (eventLog.length > 200) eventLog.shift()
}

function emitTo(conn: Connection, envelope: RealtimeEvent) {
  conn.io.client.emit(envelope.type, envelope)
}

/** Evento público: alterações de preço/disponibilidade de um NFT. */
export function emitNftUpdated(nft: Nft) {
  const envelope: NftUpdatedEvent = {
    eventId: `nft:${nft.id}:v${nft.version}`,
    type: 'nft.updated',
    resource: { kind: 'nft', id: nft.id },
    version: nft.version,
    sessionId: null,
    emittedAt: new Date().toISOString(),
    payload: { nft: structuredClone(nft) },
  }
  log(envelope, null)
  for (const c of connections) emitTo(c, envelope)
}

/** Evento privado: entregue apenas às sessões do dono do pedido. */
export function emitOrderUpdated(userId: string, order: Order) {
  for (const c of connections) {
    if (c.userId !== userId) continue
    const envelope: OrderUpdatedEvent = {
      eventId: `order:${order.id}:v${order.version}`,
      type: 'order.updated',
      resource: { kind: 'order', id: order.id },
      version: order.version,
      sessionId: c.sessionId,
      emittedAt: new Date().toISOString(),
      payload: { order: structuredClone(order) },
    }
    log(envelope, c.sessionId)
    emitTo(c, envelope)
  }
}

/** Reenvia um evento já emitido (duplicata) — usado para testar deduplicação. */
export function replayEvent(match: (e: RealtimeEvent) => boolean) {
  const found = [...eventLog].reverse().find((e) => match(e.envelope))
  if (!found) return false
  for (const c of connections) {
    if (found.target !== null && c.sessionId !== found.target) continue
    emitTo(c, found.envelope)
  }
  return true
}

/** Emite um envelope arbitrário (ex.: versão antiga) pelo servidor socket. */
export function emitRaw(envelope: RealtimeEvent) {
  for (const c of connections) {
    if (envelope.sessionId !== null && c.sessionId !== envelope.sessionId) continue
    emitTo(c, envelope)
  }
}

/** Derruba todas as conexões; novas tentativas são recusadas por `blockMs`. */
export function dropConnections(blockMs = 0) {
  blockedUntil = Date.now() + blockMs
  for (const c of [...connections]) c.close()
}

export function connectionCount() {
  return connections.size
}

export const socketHandlers = [
  socketServer.addEventListener('connection', (connection) => {
    const { client } = connection
    if (Date.now() < blockedUntil) {
      // "Servidor indisponível": não responde ao handshake; o timeout do cliente agenda nova tentativa.
      return
    }
    const io = toSocketIo(connection)
    const entry: Connection = { io, close: () => client.close(), userId: null, sessionId: null }
    connections.add(entry)

    // Pacote CONNECT do Socket.IO ("40{...auth}") traz o token da sessão.
    client.addEventListener('message', (event) => {
      if (typeof event.data !== 'string' || !event.data.startsWith('40')) return
      try {
        const auth = JSON.parse(event.data.slice(2) || '{}') as { token?: string | null }
        const session = getDb().sessions.find((s) => s.token === auth.token && s.expiresAt > Date.now())
        entry.userId = session?.userId ?? null
        entry.sessionId = session?.sessionId ?? null
      } catch {
        /* handshake sem auth: visitante */
      }
    })

    const ping = setInterval(() => client.send('2'), 20_000)
    client.addEventListener('close', () => {
      clearInterval(ping)
      connections.delete(entry)
    })
  }),
]
