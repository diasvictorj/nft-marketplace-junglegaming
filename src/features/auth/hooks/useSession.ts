import { useQuery } from '@tanstack/react-query'
import { sessionQueryOptions } from '../api/session'

/** Sessão atual (null = visitante). `ownerId` identifica carrinho/cotação. */
export function useSession() {
  const query = useQuery(sessionQueryOptions)
  const session = query.data ?? null
  return {
    ...query,
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    ownerId: session?.user.id ?? 'guest',
  }
}

/** Para componentes sob rotas privadas: a sessão já foi garantida pelo guard. */
export function useRequiredUser() {
  const { user } = useSession()
  if (!user) throw new Error('useRequiredUser fora de rota autenticada')
  return user
}
