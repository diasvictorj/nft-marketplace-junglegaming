import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { applyApiErrors } from '@/components/form/applyApiErrors'
import { Field, FormAlert, PasswordInput } from '@/components/form/Field'
import { notifyUnavailable } from '@/components/common/Unavailable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { establishSession, login } from '@/features/auth/api/session'
import { AuthDialog } from '@/features/auth/components/AuthDialog'
import { authSearchSchema, loginSchema, safeRedirect } from '@/features/auth/model/schemas'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: 'Entrar · Kurio' }] }),
  component: LoginPage,
})

type LoginForm = z.infer<typeof loginSchema>

function LoginPage() {
  const { redirect, reason } = Route.useSearch()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      establishSession(queryClient, session)
      toast.success(`Bem-vindo(a), ${session.user.name}!`)
      void navigate({ href: safeRedirect(redirect), replace: true })
    },
    onError: (error) => setFormError(applyApiErrors(error, form.setError, ['email', 'password'])),
  })

  return (
    <AuthDialog mode="login" redirect={redirect} description="Entre para gerenciar sua carteira, coleção e perfil de criador.">
      {reason === 'expired' && (
        <p role="status" className="mb-4 rounded-md border border-primary/60 bg-surface-dark px-3 py-2 text-sm">
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => {
          setFormError(null)
          mutation.mutate(values)
        })}
        className="space-y-4"
      >
        <FormAlert>{formError}</FormAlert>
        <Field label="E-mail" hideLabel error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" placeholder="contato@email.com" {...form.register('email')} />}
        </Field>
        <Field label="Senha" hideLabel error={errors.password?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" placeholder="Senha" {...form.register('password')} />}
        </Field>
        <div className="text-right">
          <button type="button" className="text-sm text-text-accent hover:underline" onClick={() => notifyUnavailable('A recuperação de senha')}>
            Esqueceu a senha?
          </button>
        </div>
        <Button type="submit" size="xl" className="mt-4 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary md:hidden">
        Novo na Kurio?{' '}
        <Link to="/signup" search={{ redirect }} className="text-text-accent underline-offset-4 hover:underline">
          Crie uma conta
        </Link>
      </p>
    </AuthDialog>
  )
}
