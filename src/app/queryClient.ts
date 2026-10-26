import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

/**
 * Política de cache/retries (documentada em ARCHITECTURE.md):
 * - staleTime 30s: dados públicos reaproveitados na navegação; eventos Socket.IO invalidam antes disso.
 * - gcTime 5min.
 * - retry: até 2x e SOMENTE para falhas transitórias (rede/5xx); 4xx nunca é repetido.
 * - mutations: sem retry automático (idempotência é responsabilidade do fluxo de pedido).
 * - refetchOnWindowFocus/reconnect ligados para reconciliar com o servidor.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) =>
        error instanceof ApiError && error.retryable && failureCount < 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    },
    mutations: { retry: false },
  },
})
