import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { applyApiErrors } from '@/components/form/applyApiErrors'
import { Field, FormAlert } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NETWORK_OPTIONS, PROVIDER_LABEL } from '@/features/checkout/model/schema'
import type { Wallet } from '@/lib/api/contracts'
import { announce } from '@/lib/a11y/announce'
import { useWalletMutations } from '../api/wallets'

const walletSchema = z.object({
  label: z.string().trim().min(2, 'Use entre 2 e 40 caracteres').max(40, 'Use entre 2 e 40 caracteres'),
  network: z.enum(['ethereum', 'polygon', 'solana'], { message: 'Selecione uma rede' }),
  address: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço deve ter o formato 0x seguido de 40 caracteres hexadecimais'),
  provider: z.enum(['metamask', 'walletconnect', 'coinbase'], { message: 'Selecione o tipo de carteira' }),
})
type WalletFormValues = z.infer<typeof walletSchema>

/** Cadastro/edição de uma carteira (principal ou secundária) com erros da API por campo. */
export function WalletForm({
  userId,
  kind,
  wallet,
  onDone,
}: {
  userId: string
  kind: 'primary' | 'secondary'
  wallet?: Wallet
  onDone?: () => void
}) {
  const { create, update } = useWalletMutations(userId)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletFormValues>({
    resolver: zodResolver(walletSchema),
    defaultValues: wallet
      ? { label: wallet.label, network: wallet.network, address: wallet.address, provider: wallet.provider }
      : { label: '', network: undefined, address: '', provider: undefined },
  })
  const { errors, isDirty } = form.formState
  const pending = create.isPending || update.isPending
  const prefix = kind === 'primary' ? 'principal' : 'secundária'

  return (
    <form
      noValidate
      aria-label={`Carteira ${prefix}`}
      className="space-y-5"
      onSubmit={form.handleSubmit((v) => {
        setFormError(null)
        const opts = {
          onSuccess: () => {
            toast.success(`Carteira ${prefix} salva.`)
            announce(`Carteira ${prefix} salva.`)
            form.reset(v)
            onDone?.()
          },
          onError: (e: Error) => setFormError(applyApiErrors(e, form.setError, ['label', 'network', 'address', 'provider'])),
        }
        if (wallet) update.mutate({ id: wallet.id, kind: wallet.kind, ...v }, opts)
        else create.mutate({ kind, ...v }, opts)
      })}
    >
      <FormAlert>{formError}</FormAlert>
      <div className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
        <Field label="Apelido da carteira" required error={errors.label?.message}>
          {(a) => <Input {...a} {...form.register('label')} />}
        </Field>
        <Field label="Rede" required error={errors.network?.message}>
          {(a) => (
            <Controller
              control={form.control}
              name="network"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger {...a} className="w-full">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {NETWORK_OPTIONS.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>
        <Field label="Endereço da carteira" required error={errors.address?.message}>
          {(a) => <Input {...a} placeholder="Endereço 0x da carteira" spellCheck={false} {...form.register('address')} />}
        </Field>
        <Field label="Tipo de carteira" required error={errors.provider?.message}>
          {(a) => (
            <Controller
              control={form.control}
              name="provider"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger {...a} className="w-full">
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_LABEL).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={pending || (!!wallet && !isDirty)}>
          {pending ? 'Salvando…' : 'Salvar carteira'}
        </Button>
        {onDone && !wallet && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
