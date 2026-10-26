import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Pagamento</h1>
      <p className="text-muted-foreground">
        TODO: dados do colecionador, carteira/rede, revisão, revalidação da cotação e envio idempotente.
      </p>
    </section>
  )
}
