import { NftImage } from '@/components/common/NftImage'
import type { QuoteLine } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'

/** Itens de uma cotação/recibo (snapshot): nome, token, quantidade e subtotal. */
export function OrderItems({ lines, title = 'NFTs' }: { lines: QuoteLine[]; title?: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{title}</caption>
      <thead>
        <tr className="border-b border-border-soft text-left">
          <th scope="col" className="pb-2 font-bold">
            NFTs
          </th>
          <th scope="col" className="px-2 pb-2 text-center font-bold">
            Edições
          </th>
          <th scope="col" className="pb-2 text-right font-bold">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.editionId} className="border-b border-border/60 last:border-0">
            <td className="py-2">
              <div className="flex items-center gap-3">
                <NftImage image={l.image} sizes="56px" className="size-14 shrink-0 rounded-md" decorative />
                <div className="min-w-0">
                  <p className="truncate font-bold">{l.title}</p>
                  <p className="text-xs text-text-secondary">
                    {l.editionLabel} · ID do token: {l.tokenId}
                  </p>
                </div>
              </div>
            </td>
            <td className="px-2 py-2 text-center text-xs whitespace-nowrap">(x {l.quantity})</td>
            <td className="py-2 text-right font-bold whitespace-nowrap text-text-accent">{formatEth(l.lineTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
