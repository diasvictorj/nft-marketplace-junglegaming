import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { QueryError } from '@/components/common/QueryError'
import { Gallery } from '@/features/nft/components/Gallery'
import { NftDetailTabs } from '@/features/nft/components/NftDetailTabs'
import { PurchasePanel } from '@/features/nft/components/PurchasePanel'
import { RelatedNfts } from '@/features/nft/components/RelatedNfts'
import { nftDetailQueryOptions } from '@/features/nft/api/nft'
import { isApiError } from '@/lib/api/client'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      return await queryClient.ensureQueryData(nftDetailQueryOptions(params.nftId))
    } catch (e) {
      if (isApiError(e) && e.status === 404) throw notFound()
      throw e
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} · Kurio` : 'NFT · Kurio' }],
  }),
  pendingMs: 100,
  pendingComponent: DetailSkeleton,
  notFoundComponent: NftNotFound,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-xl px-4 py-16">
      <QueryError title="Não foi possível carregar este NFT" error={error} onRetry={reset} />
    </div>
  ),
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft } = useSuspenseQuery(nftDetailQueryOptions(nftId))
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-16 px-4 pt-2 pb-56 md:pt-6 md:pb-0 xl:px-0">
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }]} />
        <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[440px_1fr] lg:gap-12">
          <Gallery images={nft.images} title={nft.title} />
          <PurchasePanel key={nft.id} nft={nft} />
        </div>
      </div>
      <NftDetailTabs nft={nft} />
      <RelatedNfts nft={nft} />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 xl:px-0" aria-busy="true">
      <p className="sr-only" role="status">
        Carregando NFT…
      </p>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[440px_1fr] lg:gap-12">
        <div className="flex flex-col-reverse gap-4 md:flex-row">
          <div className="flex gap-3 md:flex-col">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton size-16 md:size-[62px]" />
            ))}
          </div>
          <div className="skeleton aspect-square flex-1" />
        </div>
        <div className="space-y-4">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-6 w-1/4" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-8 w-1/2" />
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    </div>
  )
}

function NftNotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">NFT não encontrado</h1>
      <p className="mt-2 text-text-secondary">Este NFT não existe ou foi removido do catálogo.</p>
      <Link to="/" hash="catalogo" className="mt-6 inline-block font-bold text-text-accent underline underline-offset-4">
        Explorar o catálogo
      </Link>
    </section>
  )
}
