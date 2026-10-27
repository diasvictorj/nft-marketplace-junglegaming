import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { setSessionExpiredHandler } from '@/lib/api/client'
import { qk } from '@/lib/api/queryKeys'
import { dropSession } from '../api/session'
import { useSession } from '../hooks/useSession'

/**
 * Trata expiração de sessão durante a navegação e o checkout:
 *  - qualquer 401 SESSION_EXPIRED/INVALID_SESSION de uma requisição autenticada
 *    derruba a sessão local, limpa o cache privado e leva ao login preservando a rota;
 *  - um timer verifica a sessão quando `expiresAt` é atingido (sem esperar um clique).
 * O rascunho do checkout fica em sessionStorage e é retomado após o novo login.
 */
export function SessionWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { session } = useSession()

  useEffect(() => {
    let handling = false
    setSessionExpiredHandler((code) => {
      if (handling) return
      handling = true
      const { href, pathname } = router.state.location
      dropSession(queryClient)
      toast.error(code === 'SESSION_EXPIRED' ? 'Sua sessão expirou.' : 'Sua sessão não é mais válida.', {
        id: 'session-expired',
        description: 'Entre novamente para continuar de onde parou.',
      })
      if (!pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
        void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
      }
      setTimeout(() => {
        handling = false
      }, 1500)
    })
    return () => setSessionExpiredHandler(null)
  }, [queryClient, router])

  useEffect(() => {
    if (!session) return
    const ms = Date.parse(session.expiresAt) - Date.now()
    // setTimeout aceita no máximo ~24,8 dias.
    if (ms > 2 ** 31 - 1) return
    const timer = setTimeout(() => void queryClient.refetchQueries({ queryKey: qk.session() }), Math.max(0, ms) + 250)
    return () => clearTimeout(timer)
  }, [queryClient, session])

  return null
}
