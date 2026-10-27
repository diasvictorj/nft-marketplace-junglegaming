import { Link } from '@tanstack/react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { NftImage } from '@/components/common/NftImage'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { announce } from '@/lib/a11y/announce'
import { isApiError } from '@/lib/api/client'
import type { Cart, CartLine, Quote } from '@/lib/api/contracts'
import { ethMul, formatEth } from '@/lib/money/eth'
import { cn } from '@/lib/utils'
import { useCartMutations } from '../api/cart'

function issueText(line: CartLine) {
  if (line.available === 0) return 'Esta edição esgotou. Remova o item para continuar.'
  if (line.quantity > line.available) return `Só restam ${line.available} unidade(s). Ajuste a quantidade.`
  return null
}

export function CartLines({ cart, quote }: { cart: Cart; quote?: Quote }) {
  const { setQuantity, remove } = useCartMutations()
  const onError = (e: Error) => toast.error('Não foi possível atualizar o carrinho.', { description: isApiError(e) ? e.message : undefined })

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_130px_120px_48px] border-b border-primary/60 pb-2 text-sm font-bold md:grid" aria-hidden>
        <span>NFTs</span>
        <span>Preço</span>
        <span>Edições</span>
        <span>Total</span>
        <span />
      </div>
      <ul className="mt-3 space-y-3" aria-label="Itens do carrinho">
        {cart.lines.map((line) => {
          const issue = issueText(line)
          const quoteLine = quote?.lines.find((l) => l.editionId === line.editionId)
          const busy =
            (setQuantity.isPending && setQuantity.variables?.editionId === line.editionId) ||
            (remove.isPending && remove.variables?.editionId === line.editionId)
          return (
            <li
              key={line.editionId}
              aria-busy={busy}
              className={cn('rounded-lg bg-card transition-opacity', busy && 'opacity-60', issue && 'ring-1 ring-destructive/70')}
            >
              <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 md:grid-cols-[70px_minmax(0,1fr)_120px_130px_120px_48px]">
                <NftImage image={line.image} sizes="88px" className="row-span-3 rounded-l-lg md:row-span-1" />
                <div className="min-w-0 pt-2 md:pt-0">
                  <Link to="/nfts/$nftId" params={{ nftId: line.nftId }} className="block truncate font-bold hover:text-text-accent">
                    {line.title}
                  </Link>
                  <p className="text-xs text-text-secondary">
                    Edição: {line.editionLabel} · ID do token: {line.tokenId}
                  </p>
                </div>
                <p className="text-sm font-bold text-text-secondary md:text-base">
                  <span className="md:sr-only">Preço unitário: </span>
                  {formatEth(line.unitPrice)}
                  {line.unitPrice !== line.seenUnitPrice && (
                    <span className="ml-2 text-xs font-normal text-text-accent line-through">
                      <span className="sr-only">antes </span>
                      {formatEth(line.seenUnitPrice)}
                    </span>
                  )}
                </p>
                <div className="flex items-center justify-between gap-2 pr-3 pb-2 md:contents">
                  <QuantityStepper
                    size="sm"
                    label={`Quantidade de ${line.title}`}
                    value={line.quantity}
                    max={Math.max(line.quantity <= line.available ? line.available : line.quantity, 1)}
                    disabled={busy || line.available === 0}
                    onChange={(quantity) =>
                      setQuantity.mutate(
                        { nftId: line.nftId, editionId: line.editionId, quantity },
                        { onError, onSuccess: () => announce(`Quantidade de ${line.title} alterada para ${quantity}.`) },
                      )
                    }
                  />
                  <p className="font-bold text-text-accent">
                    <span className="sr-only">Total do item: </span>
                    {formatEth(quoteLine?.lineTotal ?? ethMul(line.unitPrice, line.quantity))}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      remove.mutate(
                        { nftId: line.nftId, editionId: line.editionId },
                        { onError, onSuccess: () => announce(`${line.title} removido do carrinho.`) },
                      )
                    }
                    className="grid size-9 place-items-center rounded-md text-text-secondary hover:bg-surface-dark hover:text-destructive"
                    aria-label={`Remover ${line.title} (${line.editionLabel}) do carrinho`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              {issue && (
                <p className="flex items-center gap-2 px-3 pb-3 text-xs text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                  {issue}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
