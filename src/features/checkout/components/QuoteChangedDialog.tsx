import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Quote } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'

/**
 * A cotação revisada ficou desatualizada (preço, disponibilidade, cupom ou taxa).
 * O pedido só pode seguir após o usuário confirmar explicitamente os novos valores.
 */
export function QuoteChangedDialog({
  previous,
  next,
  onAccept,
  onCancel,
}: {
  previous: Quote | null
  next: Quote | null
  onAccept: () => void
  onCancel: () => void
}) {
  const open = !!(previous && next)
  const changes =
    previous && next
      ? next.lines.flatMap((l) => {
          const old = previous.lines.find((p) => p.editionId === l.editionId)
          const out: string[] = []
          if (old && old.unitPrice !== l.unitPrice) out.push(`${l.title} (${l.editionLabel}): ${formatEth(old.unitPrice)} → ${formatEth(l.unitPrice)}`)
          if (l.issues.includes('sold-out')) out.push(`${l.title} (${l.editionLabel}): esgotado`)
          else if (l.issues.includes('insufficient')) out.push(`${l.title} (${l.editionLabel}): restam ${l.available}`)
          return out
        })
      : []
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Os valores do pedido mudaram</DialogTitle>
          <DialogDescription>Revise a nova cotação antes de confirmar. Nada foi cobrado.</DialogDescription>
        </DialogHeader>
        {previous && next && (
          <div className="space-y-3 text-sm">
            {changes.length > 0 && (
              <ul className="list-inside list-disc space-y-1 text-text-secondary">
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <dl className="grid grid-cols-2 gap-2 rounded-md bg-surface-dark p-3">
              <dt>Total anterior</dt>
              <dd className="text-right line-through">{formatEth(previous.total)}</dd>
              <dt className="font-bold">Novo total</dt>
              <dd className="text-right font-bold text-text-accent">{formatEth(next.total)}</dd>
            </dl>
            {next.blocked && (
              <p role="alert" className="text-destructive">
                Há itens indisponíveis. Ajuste o carrinho para continuar.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {next?.blocked ? 'Ir para o carrinho' : 'Cancelar'}
          </Button>
          {!next?.blocked && <Button onClick={onAccept}>Aceitar novos valores</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
