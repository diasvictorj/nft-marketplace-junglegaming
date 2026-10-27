import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { ChangePasswordRequest, SessionResponse, UpdateProfileRequest, User } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

export const profileQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.profile(userId),
    queryFn: async ({ signal }) => (await http.get<User>('/profile', { signal })).data,
  })

/** Mantém a sessão em cache coerente com o perfil (nome/avatar no cabeçalho). */
function useSyncUser(userId: string) {
  const queryClient = useQueryClient()
  return (user: User) => {
    queryClient.setQueryData(qk.profile(userId), user)
    queryClient.setQueryData<SessionResponse | null>(qk.session(), (s) => (s && s.user.id === user.id ? { ...s, user } : s))
  }
}

export function useProfileMutations(userId: string) {
  const sync = useSyncUser(userId)
  return {
    update: useMutation({
      mutationFn: async (body: UpdateProfileRequest) => (await http.patch<User>('/profile', body)).data,
      onSuccess: sync,
    }),
    avatar: useMutation({
      mutationFn: async (dataUrl: string | null) => (await http.put<User>('/profile/avatar', { dataUrl })).data,
      onSuccess: sync,
    }),
    password: useMutation({
      mutationFn: async (body: ChangePasswordRequest) => {
        await http.post('/profile/password', body)
      },
    }),
  }
}
