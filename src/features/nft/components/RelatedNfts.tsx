import { useQuery } from '@tanstack/react-query'
import { nftListQueryOptions } from '@/features/catalog/api/catalog'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/NftCard'
import type { Nft } from '@/lib/api/contracts'

/** "Mais desta coleção": consulta o catálogo pela coleção, excluindo o NFT atual. */
export function RelatedNfts({ nft, title = 'Mais desta coleção' }: { nft?: Nft; title?: string }) {
  const { data, isPending } = useQuery(
    nftListQueryOptions({ q: nft?.collection, sort: 'recent', tab: 'all', page: 1, pageSize: 6 }, null),
  )
  const items = (data?.items ?? []).filter((n) => n.id !== nft?.id).slice(0, 5)
  return (
    <section aria-labelledby="related-title">
      <h2 id="related-title" className="border-b border-primary/60 pb-2 text-sm font-bold text-text-accent">
        {title}
      </h2>
      <ul className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-40 shrink-0 lg:w-auto">
                <NftCardSkeleton />
              </li>
            ))
          : items.map((n) => (
              <li key={n.id} className="w-40 shrink-0 snap-start lg:w-auto">
                <NftCard nft={n} sizes="200px" />
              </li>
            ))}
      </ul>
    </section>
  )
}
