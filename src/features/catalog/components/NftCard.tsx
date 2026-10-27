import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/common/NftImage'
import { Price } from '@/components/common/Price'
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton'
import type { Nft } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { defaultEdition, isSoldOut } from '@/features/nft/model/editions'

export function NftCard({ nft, priority = false, sizes }: { nft: Nft; priority?: boolean; sizes?: string }) {
  const edition = defaultEdition(nft)
  const soldOut = isSoldOut(nft)
  return (
    <article className="group relative flex flex-col">
      <div className="relative rounded-lg bg-card p-3 transition-colors group-hover:bg-surface-dark">
        <NftImage
          image={nft.images[0]!}
          sizes={sizes ?? '(min-width: 1280px) 280px, (min-width: 768px) 30vw, 45vw'}
          priority={priority}
          className="rounded-lg"
        />
        {nft.attributes.includes('Raro') && (
          <span className="absolute top-3 left-3 rounded-br-md rounded-tl-lg bg-primary px-2 py-1 text-[0.625rem] font-bold text-ink">RARO</span>
        )}
        {soldOut && (
          <span className="absolute right-3 bottom-3 rounded bg-ink/90 px-2 py-1 text-xs font-bold text-text-primary">Esgotado</span>
        )}
        <FavoriteButton nftId={nft.id} title={nft.title} className="absolute top-5 right-5 z-10" />
      </div>
      <h3 className="mt-3 text-sm">
        <Link
          to="/nfts/$nftId"
          params={{ nftId: nft.id }}
          className={cn('after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none', 'focus-visible:after:outline-2 focus-visible:after:outline-ring')}
        >
          {nft.title}
        </Link>
      </h3>
      <Price value={edition.price} compareAt={nft.compareAtPrice} className="text-sm" />
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="rounded-lg bg-card p-3">
        <div className="skeleton aspect-square w-full rounded-lg" />
      </div>
      <div className="skeleton mt-3 h-4 w-3/4" />
      <div className="skeleton mt-2 h-4 w-1/3" />
    </div>
  )
}
