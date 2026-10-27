import type { Edition, Nft } from '@/lib/api/contracts'

export function defaultEdition(nft: Nft): Edition {
  return nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]!
}

export const isSoldOut = (nft: Nft) => nft.editions.every((e) => e.available === 0)

/** Edição inicial no detalhe: a padrão se disponível, senão a primeira disponível. */
export function initialEdition(nft: Nft): Edition {
  const d = defaultEdition(nft)
  return d.available > 0 ? d : (nft.editions.find((e) => e.available > 0) ?? d)
}
