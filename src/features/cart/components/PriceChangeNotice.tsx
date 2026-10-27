import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'
import { useCartMutations } from '../api/cart'

/** Aviso persistente (role=status) quando o preço de um item mudou desde que foi adicionado. */
export function PriceChangeNotice({ cart }: { cart: Cart }) {
  const { acknowledge } = useCartMutations()
  const changed = cart.lines.filter((l) => l.unitPrice !== l.seenUnitPrice)
  if (!changed.length) return null
  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border border-primary bg-surface-dark p-4 sm:flex-row sm:items-center">
      <Info className="size-5 shrink-0 text-text-accent" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-bold">Preços atualizados desde que você adicionou estes itens:</p>
        <ul className="mt-1 list-inside list-disc text-text-secondary">
          {changed.map((l) => (
            <li key={l.editionId}>
              {l.title} ({l.editionLabel}): de {formatEth(l.seenUnitPrice)} para {formatEth(l.unitPrice)}
            </li>
          ))}
        </ul>
      </div>
      <Button size="sm" variant="outline" disabled={acknowledge.isPending} onClick={() => acknowledge.mutate()}>
        Entendi
      </Button>
    </div>
  )
}
