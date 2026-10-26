import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/orders/$orderId')({
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Pedido {orderId}</h1>
      <p className="text-muted-foreground">
        TODO: pendente/confirmado/recusado, recuperação após refresh e recibo (snapshot).
      </p>
    </section>
  )
}
