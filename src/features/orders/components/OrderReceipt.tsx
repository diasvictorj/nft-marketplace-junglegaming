import { ExternalLink } from 'lucide-react'
import { OrderItems } from '@/features/checkout/components/OrderItems'
import { PROVIDER_LABEL } from '@/features/checkout/model/schema'
import { shortAddress } from '@/features/checkout/components/WalletPicker'
import type { Order } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'

const NETWORK = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

/** Recibo do pedido confirmado: reproduz o snapshot (order.quote), imune a mudanças do catálogo. */
export function OrderReceipt({ order }: { order: Order }) {
  const q = order.quote
  const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.updatedAt))
  return (
    <div className="space-y-6">
      <div className="text-center">
        <svg viewBox="0 0 64 64" className="mx-auto size-20 text-primary" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 26 32 8l24 18v30H8z" />
          <path d="m8 26 24 18 24-18" />
          <rect x="16" y="14" width="32" height="20" rx="2" fill="var(--card)" />
          <text x="32" y="23" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">
            THANK
          </text>
          <text x="32" y="31" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">
            YOU
          </text>
        </svg>
        <h1 className="mt-4 text-lg font-bold text-text-accent">Seus NFTs agora estão na sua carteira</h1>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-y border-primary py-4 text-sm sm:grid-cols-4 sm:divide-x sm:divide-border-soft">
        <div className="sm:px-3">
          <dt className="font-bold">ID da transação</dt>
          <dd className="truncate" title={order.transactionRef ?? undefined}>
            {order.transactionRef ? shortAddress(order.transactionRef) : '—'}
          </dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-text-secondary">Data</dt>
          <dd>{date}</dd>
        </div>
        <div className="sm:px-3">
          <dt className="text-text-secondary">Total</dt>
          <dd>{formatEth(q.total)}</dd>
        </div>
        <div className="sm:px-3">
          <dt className="font-bold">Carteira</dt>
          <dd>{PROVIDER_LABEL[order.wallet.provider]}</dd>
        </div>
      </dl>
      <section aria-labelledby="receipt-items">
        <h2 id="receipt-items" className="mb-3 font-bold">
          Detalhes da transação · Pedido {order.id}
        </h2>
        <OrderItems lines={q.lines} />
        <dl className="mt-4 space-y-2 border-t border-border-soft pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatEth(q.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Desconto{q.couponCode && !q.couponError ? ` (${q.couponCode})` : ''}</dt>
            <dd>(-) {formatEth(q.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Taxa de rede ({NETWORK[order.network]})</dt>
            <dd>{formatEth(q.networkFee)}</dd>
          </div>
          <div className="flex justify-between border-t border-border-soft pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="text-text-accent">{formatEth(q.total)}</dd>
          </div>
        </dl>
      </section>
      <p className="text-center text-sm leading-6 text-text-secondary">
        Transação confirmada na {NETWORK[order.network]} (simulação). A propriedade foi transferida para sua carteira {order.wallet.label}.
      </p>
      {order.explorerUrl && (
        <div className="text-center">
          <a
            href={order.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 font-bold text-ink hover:bg-text-accent"
          >
            Ver no Etherscan <ExternalLink className="size-4" aria-hidden />
            <span className="sr-only">(link simulado, abre em nova aba)</span>
          </a>
          <p className="mt-2 text-xs text-text-secondary">Referência e link de exploração são simulados.</p>
        </div>
      )}
    </div>
  )
}
