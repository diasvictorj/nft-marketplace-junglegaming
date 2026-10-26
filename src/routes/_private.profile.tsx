import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Perfil do colecionador</h1>
      <p className="text-muted-foreground">TODO: dados, avatar e alteração de senha.</p>
    </section>
  )
}
