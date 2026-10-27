import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { FeaturedResponse, Nft, NftFacets, NftListParams, Page } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

export const CATALOG_PAGE_SIZE = 9

/**
 * Lista paginada. A key inclui todos os parâmetros, e o `signal` cancela a
 * requisição quando os parâmetros mudam: respostas fora de ordem nunca
 * sobrescrevem a consulta atual.
 */
export const nftListQueryOptions = (params: NftListParams, userId: string | null) =>
  queryOptions({
    // A lista de favoritos é privada: fica sob a key do usuário.
    queryKey: params.favorites ? ([...qk.user(userId ?? 'anon'), 'favorite-nfts', params] as const) : qk.nfts.list(params),
    queryFn: async ({ signal }) => (await http.get<Page<Nft>>('/nfts', { params, signal })).data,
    placeholderData: keepPreviousData,
  })

export const facetsQueryOptions = queryOptions({
  queryKey: qk.nfts.facets(),
  queryFn: async ({ signal }) => (await http.get<NftFacets>('/nfts/facets', { signal })).data,
  staleTime: 5 * 60_000,
})

export const featuredQueryOptions = queryOptions({
  queryKey: qk.nfts.featured(),
  queryFn: async ({ signal }) => (await http.get<FeaturedResponse>('/nfts/featured', { signal })).data,
})
