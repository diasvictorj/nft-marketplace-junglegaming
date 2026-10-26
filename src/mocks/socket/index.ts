import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { env } from '@/lib/env'

/**
 * Servidor Socket.IO simulado via MSW (ws.link + @mswjs/socket.io-binding).
 * O app usa o `socket.io-client` real; só o transporte é interceptado.
 *
 * Limitações (também em ARCHITECTURE.md): apenas WebSocket (sem long-polling),
 * sem rooms/namespaces/broadcast nativos — o registro de conexões abaixo faz o
 * "broadcast" manualmente. O servidor vive no tab/worker do navegador.
 */
export const socketServer = ws.link(`${env.socketUrl}/socket.io/`)

type IoConnection = ReturnType<typeof toSocketIo>
const connections = new Set<{ io: IoConnection; sessionId: string | null }>()

/** Emite um evento para as conexões abertas (usado pelos handlers REST e por testes). */
export function emitToSessions(event: string, payload: unknown, sessionId?: string | null) {
  for (const c of connections) {
    if (sessionId && c.sessionId !== sessionId) continue
    c.io.client.emit(event, payload)
  }
}

export const socketHandlers = [
  socketServer.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const entry = { io, sessionId: null as string | null }
    connections.add(entry)
    connection.client.addEventListener('close', () => connections.delete(entry))
  }),
]
