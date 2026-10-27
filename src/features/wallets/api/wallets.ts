import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { http } from '@/lib/api/client'
import type { Wallet, WalletInput } from '@/lib/api/contracts'
import { qk } from '@/lib/api/queryKeys'

export const walletsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: qk.wallets(userId),
    queryFn: async ({ signal }) => (await http.get<Wallet[]>('/wallets', { signal })).data,
  })

export function useWalletMutations(userId: string) {
  const queryClient = useQueryClient()
  const key = qk.wallets(userId)
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const replace = (wallet: Wallet) =>
    queryClient.setQueryData<Wallet[]>(key, (list) => list?.map((w) => (w.id === wallet.id ? wallet : w)))

  return {
    create: useMutation({
      mutationFn: async (body: WalletInput) => (await http.post<Wallet>('/wallets', body)).data,
      onSuccess: () => refresh(),
    }),
    update: useMutation({
      mutationFn: async ({ id, ...body }: WalletInput & { id: string }) => (await http.patch<Wallet>(`/wallets/${id}`, body)).data,
      // Trocar o papel (principal/secundária) afeta a outra carteira: recarrega a lista.
      onSuccess: () => refresh(),
    }),
    connect: useMutation({
      mutationFn: async (id: string) => (await http.post<Wallet>(`/wallets/${id}/connect`)).data,
      onSuccess: replace,
    }),
    disconnect: useMutation({
      mutationFn: async (id: string) => (await http.post<Wallet>(`/wallets/${id}/disconnect`)).data,
      onSuccess: replace,
    }),
  }
}
