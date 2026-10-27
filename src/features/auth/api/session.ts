import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { ApiError, http } from '@/lib/api/client'
import type { LoginRequest, SessionResponse, SignupRequest } from '@/lib/api/contracts'
import { privateKeyPrefixes, qk } from '@/lib/api/queryKeys'
import { clearPrivateStorage } from '@/lib/session/privateStorage'
import { getToken, setToken } from '@/lib/session/storage'

/** Retorna a sessão atual ou null para visitante (401 não é erro de UI aqui). */
export async function fetchSession(signal?: AbortSignal): Promise<SessionResponse | null> {
  if (!getToken()) return null
  try {
    const { data } = await http.get<SessionResponse>('/session', { signal })
    return data
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      setToken(null)
      return null
    }
    throw e
  }
}

export const sessionQueryOptions = queryOptions({
  queryKey: qk.session(),
  queryFn: ({ signal }) => fetchSession(signal),
  staleTime: 5 * 60_000,
  // Visitante não deve tentar de novo em loop; falhas transitórias seguem a política global.
  refetchOnWindowFocus: false,
})

export async function login(body: LoginRequest) {
  const { data } = await http.post<SessionResponse>('/auth/login', body)
  return data
}

export async function signup(body: SignupRequest) {
  const { data } = await http.post<SessionResponse>('/auth/signup', body)
  return data
}

export async function logout() {
  await http.post('/auth/logout')
}

/**
 * Remove todos os dados privados em cache (favoritos, carrinho, cotações, pedidos,
 * perfil, carteiras). Usado no login, logout, troca de usuário e expiração.
 */
export function clearPrivateCache(queryClient: QueryClient) {
  for (const queryKey of privateKeyPrefixes) {
    void queryClient.cancelQueries({ queryKey })
    queryClient.removeQueries({ queryKey })
  }
}

/** Instala uma nova sessão (login/cadastro): limpa o cache anterior e grava o token. */
export function establishSession(queryClient: QueryClient, session: SessionResponse) {
  clearPrivateCache(queryClient)
  // Rascunhos de outro usuário (ex.: troca de conta após expiração) são descartados.
  clearPrivateStorage(session.user.id)
  setToken(session.token)
  queryClient.setQueryData(qk.session(), session)
}

/**
 * Encerra a sessão local. No logout tudo é limpo; na expiração (`keepDrafts`) o
 * rascunho do checkout do usuário é mantido para retomada após novo login.
 */
export function dropSession(queryClient: QueryClient, opts: { keepDrafts?: boolean } = {}) {
  setToken(null)
  clearPrivateCache(queryClient)
  if (!opts.keepDrafts) clearPrivateStorage()
  queryClient.setQueryData(qk.session(), null)
}
