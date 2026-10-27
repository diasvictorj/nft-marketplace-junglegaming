import { useNavigate } from '@tanstack/react-router'
import { Mail, ShoppingCart, Star } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { toast } from 'sonner'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { SocialIcon } from '@/components/layout/SocialIcons'
import { Button } from '@/components/ui/button'
import { useCart, useCartMutations } from '@/features/cart/api/cart'
import { FavoriteButton } from '@/features/favorites/components/FavoriteButton'
import { isApiError } from '@/lib/api/client'
import type { Nft } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'
import { cn } from '@/lib/utils'
import { initialEdition, isSoldOut } from '../model/editions'

const NETWORK_LABEL = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

export function PurchasePanel({ nft }: { nft: Nft }) {
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const { add } = useCartMutations()
  const [editionId, setEditionId] = useState(() => initialEdition(nft).id)
  const [quantity, setQuantity] = useState(1)
  const editionGroup = useId()

  const edition = nft.editions.find((e) => e.id === editionId) ?? initialEdition(nft)
  const inCart = cart?.lines.find((l) => l.editionId === edition.id)?.quantity ?? 0
  const max = Math.max(0, edition.available - inCart)
  const soldOut = isSoldOut(nft)

  // Disponibilidade pode mudar em tempo real: mantém a quantidade dentro do limite.
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, max)))
  }, [max])

  const submit = (goToCart: boolean) => {
    add.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          toast.success(`${nft.title} (${edition.label}) × ${quantity} adicionado ao carrinho.`)
          if (goToCart) void navigate({ to: '/cart' })
        },
        onError: (e) =>
          toast.error('Não foi possível adicionar ao carrinho.', { description: isApiError(e) ? e.message : undefined }),
      },
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{nft.title}</h1>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xl font-bold text-text-accent" aria-live="polite">
            <span className="sr-only">Preço da edição {edition.label}: </span>
            {formatEth(edition.price)}
          </p>
          <p className="flex items-center gap-1 text-xs">
            <span className="flex text-text-accent" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={cn('size-3.5', i < Math.round(nft.rating) && 'fill-current')} />
              ))}
            </span>
            <span>
              <span className="sr-only">Nota {nft.rating.toFixed(1)} de 5, </span>
              {nft.reviewCount} avaliações de colecionadores
            </span>
          </p>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-bold">Sobre este NFT:</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Um colecionável digital {edition.label} finalizado à mão da coleção {nft.collection}, verificado na {NETWORK_LABEL[nft.network]},
          com arte desbloqueável e acesso para colecionadores.
        </p>
      </div>
      <fieldset>
        <legend id={editionGroup} className="text-sm font-bold">
          Edição:
        </legend>
        <div role="radiogroup" aria-labelledby={editionGroup} className="mt-2 flex flex-wrap gap-2">
          {nft.editions.map((e) => {
            const unavailable = e.available === 0
            const selected = e.id === edition.id
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={unavailable}
                onClick={() => setEditionId(e.id)}
                className={cn(
                  'rounded-full border border-border-soft px-3 py-1 text-xs uppercase',
                  selected && 'border-primary bg-surface-dark font-bold text-text-accent',
                  unavailable && 'cursor-not-allowed text-text-secondary/60 line-through',
                )}
              >
                {e.label}
                {unavailable && <span className="sr-only"> (esgotada)</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-text-secondary">
          {edition.available === 0
            ? 'Edição esgotada.'
            : `${edition.available} disponível(is)${inCart ? ` · ${inCart} já no seu carrinho` : ''}.`}
        </p>
      </fieldset>

      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-border bg-card p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:static md:pb-0 md:z-auto md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm md:sr-only">Qtd.</span>
              <QuantityStepper value={quantity} max={Math.max(1, max)} onChange={setQuantity} disabled={max === 0} />
            </div>
            <span className="text-xl font-bold text-text-accent md:hidden" aria-hidden>
              {formatEth(edition.price)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button className="min-w-0 flex-1 md:w-40 md:flex-none" size="lg" disabled={soldOut || max === 0 || add.isPending} onClick={() => submit(true)}>
              {soldOut ? 'ESGOTADO' : max === 0 ? 'LIMITE ATINGIDO' : add.isPending ? 'ADICIONANDO…' : 'COMPRAR'}
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className="shrink-0"
              aria-label="Adicionar ao carrinho e continuar navegando"
              disabled={soldOut || max === 0 || add.isPending}
              onClick={() => submit(false)}
            >
              <ShoppingCart aria-hidden />
            </Button>
            <FavoriteButton nftId={nft.id} title={nft.title} variant="button" className="hidden md:inline-flex" />
            <FavoriteButton nftId={nft.id} title={nft.title} className="size-11 shrink-0 border border-primary md:hidden" />
          </div>
        </div>
      </div>

      <dl className="space-y-3 text-sm text-text-secondary">
        <div>
          <dt className="inline">ID do token: </dt>
          <dd className="inline">{nft.tokenId}</dd>
        </div>
        <div>
          <dt className="inline">Coleção: </dt>
          <dd className="inline">{nft.collection}</dd>
        </div>
        <div>
          <dt className="inline">Atributos: </dt>
          <dd className="inline">{nft.attributes.join(', ')}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-3 text-sm font-bold">
        Compartilhar este NFT:
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartilhar no LinkedIn (abre em nova aba)"
        >
          <SocialIcon name="linkedin" className="size-4" />
        </a>
        <a href={`mailto:?subject=${encodeURIComponent(nft.title)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail">
          <Mail className="size-4" aria-hidden />
        </a>
        <a
          href={`https://x.com/intent/post?text=${encodeURIComponent(nft.title)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Compartilhar no X/Twitter (abre em nova aba)"
        >
          <SocialIcon name="twitter" className="size-4" />
        </a>
      </div>
    </div>
  )
}
