import { io, type Socket } from 'socket.io-client'
import { env } from '@/lib/env'

/**
 * Cliente Socket.IO único. A conexão é aberta/encerrada pelo ciclo de vida
 * da sessão (ver lib/realtime/RealtimeBridge) e nunca compartilhada entre usuários:
 * trocar de sessão encerra o socket anterior e libera seus listeners.
 * Em modo mock, o transporte é interceptado por @mswjs/socket.io-binding.
 */
let socket: Socket | null = null

export function connectSocket(token: string | null): Socket {
  disconnectSocket()
  socket = io(env.socketUrl, {
    path: '/socket.io',
    // O MSW 3 não intercepta URLs WebSocket com barra final.
    addTrailingSlash: false,
    transports: ['websocket'],
    auth: { token },
    // Tentativa sem handshake é abandonada após 3 s e o backoff agenda outra.
    timeout: 3000,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (!socket) return
  socket.removeAllListeners()
  socket.io.removeAllListeners()
  socket.disconnect()
  socket = null
}
