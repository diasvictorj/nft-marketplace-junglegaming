import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { QueryError } from '@/components/common/QueryError'
import { Button } from '@/components/ui/button'
import { useCart, useQuote } from '@/features/cart/api/cart'
import { CartLines } from '@/features/cart/components/CartLines'
import { CouponForm } from '@/features/cart/components/CouponForm'
import { PriceChangeNotice } from '@/features/cart/components/PriceChangeNotice'
import { QuoteSummary } from '@/features/cart/components/QuoteSummary'
import { RelatedNfts } from '@/features/nft/components/RelatedNfts'

export const Route = createFileRoute('/cart')({
  head: () => ({ meta: [{ title: 'Carrinho · Kurio' }] }),
  component: CartPage,
})

function CartPage() {
  const navigate = useNavigate()
  const cart = useCart()
  // No carrinho a taxa é estimada na rede padrão; a rede é escolhida no pagamento.
  const quote = useQuote('ethereum', cart.data)

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-16 px-4 pt-2 md:pt-6 xl:px-0">
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
        <h1 className="text-center text-xl font-bold md:sr-only">Carrinho de NFTs</h1>
        {cart.isPending ? (
          <CartSkeleton />
        ) : cart.isError ? (
          <QueryError title="Não foi possível carregar o carrinho" error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
        ) : cart.data.lines.length === 0 ? (
          <div className="rounded-lg border border-border-soft bg-card p-10 text-center">
            <ShoppingCart className="mx-auto size-10 text-text-accent" aria-hidden />
            <p className="mt-4 font-bold">Seu carrinho está vazio.</p>
            <p className="mt-1 text-sm text-text-secondary">Explore o catálogo e adicione NFTs para continuar.</p>
            <Button asChild className="mt-6">
              <Link to="/" hash="catalogo">
                Explorar NFTs
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-20">
            <div className="space-y-4">
              <PriceChangeNotice cart={cart.data} />
              <CartLines cart={cart.data} quote={quote.data} />
            </div>
            <section aria-labelledby="summary-title" className="space-y-5 rounded-t-2xl bg-card p-5 lg:rounded-none lg:bg-transparent lg:p-0">
              <h2 id="summary-title" className="hidden border-b border-primary/60 pb-2 text-lg font-bold lg:block">
                Resumo da carteira
              </h2>
              <CouponForm cart={cart.data} quote={quote.data} />
              <QuoteSummary
                quote={quote.data}
                isPending={quote.isPending}
                isFetching={quote.isFetching}
                error={quote.error}
                onRetry={() => void quote.refetch()}
              >
                {quote.data?.blocked && (
                  <p role="alert" className="text-xs text-destructive">
                    Ajuste os itens indisponíveis para finalizar a compra.
                  </p>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!quote.data || quote.data.blocked || quote.isFetching}
                  onClick={() => void navigate({ to: '/checkout' })}
                >
                  Conectar e finalizar
                </Button>
                <Link to="/" hash="catalogo" className="block text-center text-sm text-text-accent hover:underline">
                  Continuar explorando
                </Link>
              </QuoteSummary>
            </section>
          </div>
        )}
      </div>
      <RelatedNfts title="Você também pode gostar" />
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-20" aria-busy="true">
      <p className="sr-only" role="status">
        Carregando carrinho…
      </p>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-[70px] w-full" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="skeleton h-11 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-5 w-full" />
        ))}
        <div className="skeleton h-11 w-full" />
      </div>
    </div>
  )
}
