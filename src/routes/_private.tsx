import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/features/auth/api/session'

/**
 * Layout pathless que protege checkout, perfil, carteiras e pedidos.
 * Sem sessão, redireciona ao login preservando o destino em `redirect`.
 */
export const Route = createFileRoute('/_private')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  component: () => <Outlet />,
})
