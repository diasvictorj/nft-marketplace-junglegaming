import { useSyncExternalStore } from 'react'

/** Estado da conexão em tempo real, exibido de forma discreta na interface. */
export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting'

let status: RealtimeStatus = 'idle'
const listeners = new Set<() => void>()

export function setRealtimeStatus(next: RealtimeStatus) {
  if (next === status) return
  status = next
  for (const l of listeners) l()
}

export function useRealtimeStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}
