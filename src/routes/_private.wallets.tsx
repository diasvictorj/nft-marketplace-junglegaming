import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Carteiras</h1>
      <p className="text-muted-foreground">TODO: carteira principal e secundária.</p>
    </section>
  )
}
