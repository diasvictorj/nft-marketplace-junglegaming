import type { EthString } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'
import { cn } from '@/lib/utils'

export function Price({ value, compareAt, className }: { value: EthString; compareAt?: EthString | null; className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline gap-2', className)}>
      <span className="font-bold text-text-accent">{formatEth(value)}</span>
      {compareAt && (
        <span className="text-sm text-muted-foreground line-through">
          <span className="sr-only">Preço anterior: </span>
          {formatEth(compareAt)}
        </span>
      )}
    </span>
  )
}
