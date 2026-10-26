import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Entrar</h1>
      <p className="text-muted-foreground">TODO: formulário, validação e retorno ao fluxo anterior.</p>
    </section>
  )
}
