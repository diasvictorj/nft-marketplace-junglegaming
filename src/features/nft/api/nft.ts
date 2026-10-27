import { queryOptions } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { Nft } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

export const nftDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: qk.nfts.detail(id),
    queryFn: async ({ signal }) => (await http.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal })).data,
  })
