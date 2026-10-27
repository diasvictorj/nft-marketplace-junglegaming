import type { ReactNode } from 'react'
import { QueryError } from '@/components/common/QueryError'
import type { Quote } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'
import { cn } from '@/lib/utils'

/**
 * Resumo de valores vindo da cotação da API (string decimal). A UI só formata:
 * subtotal, desconto, taxa e total nunca são recalculados no cliente.
 */
export function QuoteSummary({
  quote,
  isPending,
  isFetching,
  error,
  onRetry,
  className,
  children,
}: {
  quote?: Quote
  isPending: boolean
  isFetching?: boolean
  error?: unknown
  onRetry?: () => void
  className?: string
  children?: ReactNode
}) {
  if (error && !quote) return <QueryError title="Não foi possível calcular o resumo" error={error} onRetry={onRetry} className={className} />
  const row = 'flex items-baseline justify-between gap-4'
  return (
    <div className={cn('space-y-3', className)} aria-busy={isPending || isFetching}>
      {isPending || !quote ? (
        <div aria-hidden className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={row}>
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
          <p className="sr-only" role="status">
            Calculando resumo…
          </p>
        </div>
      ) : (
        <dl className={cn('space-y-3 text-sm transition-opacity', isFetching && 'opacity-60')}>
          <div className={row}>
            <dt>Subtotal</dt>
            <dd className="text-base tabular-nums">{formatEth(quote.subtotal)}</dd>
          </div>
          <div className={row}>
            <dt>Desconto{quote.couponCode && !quote.couponError ? ` (${quote.couponCode})` : ' do lançamento'}</dt>
            <dd className="tabular-nums">(-) {formatEth(quote.discount)}</dd>
          </div>
          <div className={row}>
            <dt>Taxa de rede</dt>
            <dd className="text-right tabular-nums">
              {formatEth(quote.networkFee)}
              <span className="block text-[0.625rem] text-text-accent">Taxa estimada</span>
            </dd>
          </div>
          <div className={cn(row, 'border-t border-border-soft pt-4')}>
            <dt className="font-bold">Total</dt>
            <dd className="text-lg font-bold text-text-accent tabular-nums" aria-live="polite">
              {formatEth(quote.total)}
            </dd>
          </div>
        </dl>
      )}
      {children}
    </div>
  )
}
