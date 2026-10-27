import type { NftImage as NftImageData } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

const WIDTHS = { thumb: 320, md: 640, lg: 960 } as const

/**
 * Imagem responsiva de NFT (WebP em 3 larguras). Dimensões explícitas evitam CLS;
 * `priority` é usado apenas na imagem LCP (hero/detalhe).
 */
export function NftImage({
  image,
  sizes,
  priority = false,
  className,
  decorative = false,
}: {
  image: NftImageData
  sizes: string
  priority?: boolean
  className?: string
  decorative?: boolean
}) {
  return (
    <img
      src={`${image.src}-md.webp`}
      srcSet={Object.entries(WIDTHS)
        .map(([k, w]) => `${image.src}-${k}.webp ${w}w`)
        .join(', ')}
      sizes={sizes}
      width={640}
      height={640}
      alt={decorative ? '' : image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={cn('aspect-square h-auto w-full object-cover', className)}
    />
  )
}
