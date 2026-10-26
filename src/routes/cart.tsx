import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Carrinho</h1>
      <p className="text-muted-foreground">TODO: itens, cupom e resumo de valores.</p>
    </section>
  )
}
