import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { http } from '@/lib/api/client'
import type { FavoritesResponse } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'
import { announce } from '@/lib/a11y/announce'
import { useSession } from '@/features/auth/hooks/useSession'

export const favoritesQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.favorites(userId),
    queryFn: async ({ signal }) => (await http.get<FavoritesResponse>('/favorites', { signal })).data,
  })

export function useFavorites() {
  const { user } = useSession()
  const query = useQuery({ ...favoritesQueryOptions(user?.id ?? 'anon'), enabled: !!user })
  const ids = new Set(query.data?.nftIds ?? [])
  return { ...query, isFavorite: (nftId: string) => ids.has(nftId) }
}

/**
 * Favoritar/desfavoritar com atualização OTIMISTA: o coração muda na hora;
 * em falha, o estado anterior é restaurado (rollback) e o usuário é avisado.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: async ({ nftId, favorite }: { nftId: string; favorite: boolean; title: string }) => {
      const { data } = favorite
        ? await http.post<FavoritesResponse>('/favorites', { nftId })
        : await http.delete<FavoritesResponse>(`/favorites/${encodeURIComponent(nftId)}`)
      return data
    },
    onMutate: async ({ nftId, favorite }) => {
      if (!user) return
      const key = qk.favorites(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesResponse>(key)
      const ids = new Set(previous?.nftIds ?? [])
      if (favorite) ids.add(nftId)
      else ids.delete(nftId)
      queryClient.setQueryData<FavoritesResponse>(key, { nftIds: [...ids] })
      return { previous, key }
    },
    onError: (error, { favorite, title }, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.previous)
      toast.error(favorite ? `Não foi possível favoritar ${title}.` : `Não foi possível remover ${title} dos favoritos.`, {
        description: `${error.message} O estado anterior foi restaurado.`,
      })
    },
    onSuccess: (data, { favorite, title }, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, data)
      announce(favorite ? `${title} adicionado aos favoritos.` : `${title} removido dos favoritos.`)
    },
    onSettled: (_d, _e, _v, ctx) => {
      if (ctx) void queryClient.invalidateQueries({ queryKey: ctx.key })
    },
  })
}
