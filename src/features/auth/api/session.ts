import { queryOptions } from '@tanstack/react-query'
import { ApiError, http } from '@/lib/api/client'
import type { SessionResponse } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

/** Retorna a sessão atual ou null para visitante (401 não é erro de UI aqui). */
export async function fetchSession(signal?: AbortSignal): Promise<SessionResponse | null> {
  try {
    const { data } = await http.get<SessionResponse>('/session', { signal })
    return data
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export const sessionQueryOptions = queryOptions({
  queryKey: qk.session(),
  queryFn: ({ signal }) => fetchSession(signal),
  staleTime: 60_000,
})
