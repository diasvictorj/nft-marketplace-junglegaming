import { Link } from '@tanstack/react-router'
import { CheckCircle2, Plug, Unplug } from 'lucide-react'
import { useId } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useWalletMutations } from '@/features/wallets/api/wallets'
import { isApiError } from '@/lib/api/client'
import type { Wallet } from '@/lib/api/contracts'
import { announce } from '@/lib/a11y/announce'
import { cn } from '@/lib/utils'
import { NETWORK_OPTIONS, PROVIDER_LABEL } from '../model/schema'

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

/**
 * "Carteira e rede": escolhe uma carteira cadastrada e simula conexão/recusa/desconexão.
 * O estado da conexão é textual (não depende só de cor).
 */
export function WalletPicker({
  userId,
  wallets,
  value,
  onChange,
  error,
}: {
  userId: string
  wallets: Wallet[]
  value: string | null
  onChange: (id: string) => void
  error?: string
}) {
  const { connect, disconnect } = useWalletMutations(userId)
  const groupId = useId()
  const selected = wallets.find((w) => w.id === value)

  if (!wallets.length) {
    return (
      <div className="rounded-lg border border-border-soft p-4 text-sm">
        <p>Você ainda não cadastrou carteiras.</p>
        <Link to="/wallets" className="mt-2 inline-block font-bold text-text-accent underline underline-offset-4">
          Cadastrar carteira
        </Link>
      </div>
    )
  }

  return (
    <fieldset className="space-y-3" aria-describedby={error ? `${groupId}-error` : undefined}>
      <legend id={groupId} className="mb-1 w-full text-center font-bold">
        Carteira e rede
      </legend>
      <div role="radiogroup" aria-labelledby={groupId} aria-invalid={!!error} className="space-y-3">
        {wallets.map((w) => {
          const checked = w.id === value
          return (
            <label
              key={w.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border border-border-soft p-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                checked && 'border-primary bg-surface-dark',
              )}
            >
              <input type="radio" name="wallet" value={w.id} checked={checked} onChange={() => onChange(w.id)} className="size-4 accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {w.label} <span className="font-normal text-text-secondary">· {w.kind === 'primary' ? 'Principal' : 'Secundária'}</span>
                </span>
                <span className="block truncate text-xs text-text-secondary">
                  {PROVIDER_LABEL[w.provider]} · {shortAddress(w.address)} · {NETWORK_OPTIONS.find((n) => n.id === w.network)?.label}
                </span>
                <span className={cn('mt-1 flex items-center gap-1 text-xs', w.connected ? 'text-success' : 'text-text-secondary')}>
                  {w.connected ? <CheckCircle2 className="size-3.5" aria-hidden /> : <Unplug className="size-3.5" aria-hidden />}
                  {w.connected ? 'Conectada' : 'Desconectada'}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {selected.connected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disconnect.isPending}
              onClick={() =>
                disconnect.mutate(selected.id, {
                  onSuccess: () => announce(`Carteira ${selected.label} desconectada.`),
                })
              }
            >
              <Unplug aria-hidden /> Desconectar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={connect.isPending}
              onClick={() =>
                connect.mutate(selected.id, {
                  onSuccess: () => {
                    toast.success(`${selected.label} conectada.`)
                    announce(`Carteira ${selected.label} conectada.`)
                  },
                  onError: (e) =>
                    toast.error('Conexão recusada.', {
                      description: isApiError(e) ? e.message : 'Tente novamente na sua carteira.',
                    }),
                })
              }
            >
              <Plug aria-hidden /> {connect.isPending ? 'Aguardando a carteira…' : 'Conectar carteira'}
            </Button>
          )}
          <Link to="/wallets" className="text-xs text-text-accent underline underline-offset-4">
            Gerenciar carteiras
          </Link>
        </div>
      )}
      {error && (
        <p id={`${groupId}-error`} className="text-xs text-destructive">
          ⚠ {error}
        </p>
      )}
    </fieldset>
  )
}
