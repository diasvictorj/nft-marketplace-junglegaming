import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { QueryError } from '@/components/common/QueryError'
import { AccountLayout } from '@/components/layout/AccountLayout'
import { Button } from '@/components/ui/button'
import { useRequiredUser } from '@/features/auth/hooks/useSession'
import { useWalletMutations, walletsQueryOptions } from '@/features/wallets/api/wallets'
import { WalletForm } from '@/features/wallets/components/WalletForm'
import type { Wallet } from '@/lib/api/contracts'

export const Route = createFileRoute('/_private/wallets')({
  head: () => ({ meta: [{ title: 'Carteiras · Kurio' }] }),
  component: WalletsPage,
})

function WalletsPage() {
  const user = useRequiredUser()
  const wallets = useQuery(walletsQueryOptions(user.id))
  return (
    <AccountLayout>
      <h1 className="sr-only">Carteiras</h1>
      {wallets.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-[68px]" />
          ))}
        </div>
      ) : wallets.isError ? (
        <QueryError title="Não foi possível carregar as carteiras" error={wallets.error} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} />
      ) : (
        <div className="space-y-12">
          <WalletSection userId={user.id} kind="primary" wallet={wallets.data.find((w) => w.kind === 'primary')} />
          <WalletSection userId={user.id} kind="secondary" wallet={wallets.data.find((w) => w.kind === 'secondary')} />
        </div>
      )}
    </AccountLayout>
  )
}

function WalletSection({ userId, kind, wallet }: { userId: string; kind: Wallet['kind']; wallet?: Wallet }) {
  const [adding, setAdding] = useState(false)
  const { update } = useWalletMutations(userId)
  const title = kind === 'primary' ? 'Carteira principal' : 'Carteira secundária'
  const id = `wallet-${kind}`
  return (
    <section aria-labelledby={id} className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-bold">
            {title}
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            {wallet || adding
              ? 'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'
              : `Você ainda não adicionou uma ${title.toLowerCase()}.`}
          </p>
        </div>
        {!wallet && !adding && (
          <Button variant="link" className="px-0" onClick={() => setAdding(true)}>
            Adicionar
          </Button>
        )}
        {wallet && kind === 'secondary' && (
          <Button
            variant="outline"
            size="sm"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: wallet.id, label: wallet.label, address: wallet.address, network: wallet.network, provider: wallet.provider, kind: 'primary' },
                { onSuccess: () => toast.success(`${wallet.label} agora é a carteira principal.`) },
              )
            }
          >
            Tornar principal
          </Button>
        )}
      </div>
      {wallet ? (
        <WalletForm key={`${wallet.id}-${wallet.kind}`} userId={userId} kind={kind} wallet={wallet} />
      ) : adding ? (
        <WalletForm userId={userId} kind={kind} onDone={() => setAdding(false)} />
      ) : null}
    </section>
  )
}
