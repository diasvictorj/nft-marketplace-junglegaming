import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Criar conta</h1>
      <p className="text-muted-foreground">TODO: cadastro, validação e conflito de e-mail.</p>
    </section>
  )
}
