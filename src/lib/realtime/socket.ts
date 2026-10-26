import { io, type Socket } from 'socket.io-client'
import { env } from '@/lib/env'

/**
 * Cliente Socket.IO único. A conexão é aberta/encerrada pelo ciclo de vida
 * da sessão (ver features/auth) e nunca compartilhada entre usuários.
 * Em modo mock, o transporte é interceptado por @mswjs/socket.io-binding.
 */
let socket: Socket | null = null

export function connectSocket(sessionId: string): Socket {
  disconnectSocket()
  socket = io(env.socketUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    auth: { sessionId },
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  })
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
