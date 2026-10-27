import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/api/session'
import { useSession } from '@/features/auth/hooks/useSession'

/**
 * Layout pathless que protege checkout, perfil, carteiras e pedidos.
 * Sem sessão, redireciona ao login preservando o destino em `redirect`.
 * Se a sessão cair com a página aberta (logout/expiração), o conteúdo privado
 * deixa de ser renderizado enquanto a navegação para o login acontece.
 */
export const Route = createFileRoute('/_private')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  component: PrivateLayout,
})

function PrivateLayout() {
  const { user } = useSession()
  return user ? <Outlet /> : null
}
