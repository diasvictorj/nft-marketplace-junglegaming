import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { applyApiErrors } from '@/components/form/applyApiErrors'
import { Field, FormAlert, PasswordInput } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { establishSession, signup } from '@/features/auth/api/session'
import { AuthDialog } from '@/features/auth/components/AuthDialog'
import { authSearchSchema, safeRedirect, signupSchema } from '@/features/auth/model/schemas'

export const Route = createFileRoute('/signup')({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: 'Criar conta · Kurio' }] }),
  component: SignupPage,
})

type SignupForm = z.infer<typeof signupSchema>

function SignupPage() {
  const { redirect } = Route.useSearch()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: ({ username, email, password }: SignupForm) => signup({ username, email, password }),
    onSuccess: (session) => {
      establishSession(queryClient, session)
      toast.success('Conta criada! Seu perfil de colecionador está pronto.')
      void navigate({ href: safeRedirect(redirect), replace: true })
    },
    onError: (error) => setFormError(applyApiErrors(error, form.setError, ['username', 'email', 'password'])),
  })

  return (
    <AuthDialog mode="signup" redirect={redirect} description="Crie seu perfil de colecionador e conecte uma carteira quando quiser.">
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => {
          setFormError(null)
          mutation.mutate(values)
        })}
        className="space-y-4"
      >
        <FormAlert>{formError}</FormAlert>
        <Field label="Nome de usuário" hideLabel error={errors.username?.message}>
          {(a11y) => <Input {...a11y} autoComplete="username" placeholder="Nome de usuário" {...form.register('username')} />}
        </Field>
        <Field label="E-mail" hideLabel error={errors.email?.message}>
          {(a11y) => <Input {...a11y} type="email" autoComplete="email" placeholder="Digite seu e-mail" {...form.register('email')} />}
        </Field>
        <Field label="Senha" hideLabel error={errors.password?.message} hint="Mínimo de 8 caracteres, com letras, números e símbolo.">
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" placeholder="Senha" {...form.register('password')} />}
        </Field>
        <Field label="Confirmar senha" hideLabel error={errors.confirmPassword?.message}>
          {(a11y) => <PasswordInput {...a11y} autoComplete="new-password" placeholder="Confirmar senha" {...form.register('confirmPassword')} />}
        </Field>
        <Button type="submit" size="xl" className="mt-4 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary md:hidden">
        Já tem conta?{' '}
        <Link to="/login" search={{ redirect }} className="text-text-accent underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </AuthDialog>
  )
}
