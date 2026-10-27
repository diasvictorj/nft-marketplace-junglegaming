import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, XCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { QueryError } from '@/components/common/QueryError'
import { Button } from '@/components/ui/button'
import { useRequiredUser } from '@/features/auth/hooks/useSession'
import { orderQueryOptions } from '@/features/orders/api/orders'
import { OrderReceipt } from '@/features/orders/components/OrderReceipt'
import { announce } from '@/lib/a11y/announce'
import { qk } from '@/lib/api/queryKeys'
import { useRealtimeStatus } from '@/lib/realtime/status'

export const Route = createFileRoute('/_private/orders/$orderId')({
  head: () => ({ meta: [{ title: 'Pedido · Kurio' }] }),
  component: OrderPage,
})

/**
 * Estado do pedido. A confirmação só aparece para `confirmed` vindo da simulação
 * (evento `order.updated` ou REST). Pendente é recuperável após refresh/reconexão.
 */
function OrderPage() {
  const { orderId } = Route.useParams()
  const user = useRequiredUser()
  const queryClient = useQueryClient()
  const realtime = useRealtimeStatus()
  const { data: order, error, isPending, refetch, isFetching } = useQuery(orderQueryOptions(user.id, orderId))
  const heading = useRef<HTMLHeadingElement>(null)
  const status = order?.status

  useEffect(() => {
    if (!status || status === 'pending') return
    // Estado terminal: carrinho/estoque mudaram no servidor.
    void queryClient.invalidateQueries({ queryKey: qk.cart(user.id) })
    void queryClient.invalidateQueries({ queryKey: qk.nfts.all() })
    announce(status === 'confirmed' ? 'Pagamento confirmado.' : 'Pagamento recusado.')
    heading.current?.focus()
  }, [status, queryClient, user.id])

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-8">
      <div className="rounded-lg bg-card p-6 md:p-10">
        {isPending ? (
          <div className="space-y-4" aria-busy="true">
            <div className="skeleton mx-auto size-20 rounded-full" />
            <div className="skeleton mx-auto h-6 w-2/3" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : error || !order ? (
          <QueryError title="Não foi possível carregar o pedido" error={error} onRetry={() => void refetch()} retrying={isFetching} />
        ) : order.status === 'confirmed' ? (
          <div>
            <h2 ref={heading} tabIndex={-1} className="sr-only">
              Pedido confirmado
            </h2>
            <OrderReceipt order={order} />
            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-text-accent underline underline-offset-4">
                Continuar explorando
              </Link>
            </div>
          </div>
        ) : order.status === 'declined' ? (
          <div className="space-y-4 text-center">
            <XCircle className="mx-auto size-14 text-destructive" aria-hidden />
            <h1 ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">
              Pagamento recusado
            </h1>
            <p className="text-sm text-text-secondary">{order.declineReason ?? 'A carteira recusou o pagamento.'}</p>
            <p className="text-sm">Nada foi cobrado e os itens continuam no seu carrinho.</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild>
                <Link to="/checkout">Tentar novamente</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/cart">Ver carrinho</Link>
              </Button>
            </div>
            <p className="text-xs text-text-secondary">Pedido {order.id}</p>
          </div>
        ) : (
          <div className="space-y-4 text-center" role="status">
            <Loader2 className="mx-auto size-12 animate-spin text-text-accent" aria-hidden />
            <h1 className="text-xl font-bold">Processando pagamento…</h1>
            <p className="text-sm text-text-secondary">
              Aguardando a confirmação da rede para o pedido {order.id}. Você pode recarregar a página com segurança: o pedido não será
              duplicado.
            </p>
            <p className="text-xs">
              Tempo real: {realtime === 'connected' ? 'conectado' : realtime === 'reconnecting' ? 'reconectando… (verificando pelo servidor)' : 'conectando…'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
