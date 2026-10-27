import { z } from 'zod'
import { emailSchema, usernameSchema } from '@/features/auth/model/schemas'
import type { CollectorInfo, Network } from '@/lib/api/contracts'

export const NETWORK_OPTIONS: { id: Network; label: string }[] = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
]
export const PROVIDER_LABEL = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' } as const

/** Campos do layout "Perfil do colecionador" (obrigatórios marcados com * no Figma). */
export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: usernameSchema,
  network: z.enum(['ethereum', 'polygon', 'solana'], { message: 'Selecione uma rede' }),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  secondaryAddress: z
    .string()
    .trim()
    .refine((v) => v === '' || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+\.eth$/i.test(v), 'Use um endereço 0x… ou nome .eth')
    .optional(),
  referralCode: z.string().trim().min(3, 'Informe o código de indicação (mín. 3 caracteres)'),
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/i, 'Use 3–32 letras, números ou hífen (sem ".eth")'),
  note: z.string().max(280, 'Máximo de 280 caracteres').optional(),
})
export type CollectorForm = z.infer<typeof collectorSchema>

export function toCollectorInfo(f: CollectorForm): CollectorInfo {
  return {
    displayName: f.displayName,
    username: f.username,
    profileName: f.profileName,
    email: f.email,
    ensName: `${f.ensName}.eth`,
    referralCode: f.referralCode,
    note: f.note ?? '',
  }
}
