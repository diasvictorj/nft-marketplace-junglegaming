import { queryOptions } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { Nft } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

/**
 * Detalhe por id. Um `nft.updated` pode chegar enquanto esta requisição está em voo:
 * a resposta REST mais antiga nunca substitui uma versão mais nova já no cache.
 */
export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: async ({ signal, client, queryKey }) => {
      const { data } = await http.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })
      const cached = client.getQueryData<Nft>(queryKey)
      return cached && cached.version > data.version ? cached : data
    },
  })
