import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { QueryError } from '@/components/common/QueryError'
import { applyApiErrors } from '@/components/form/applyApiErrors'
import { Field, FormAlert, PasswordInput } from '@/components/form/Field'
import { AccountLayout } from '@/components/layout/AccountLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRequiredUser } from '@/features/auth/hooks/useSession'
import { emailSchema, newPasswordSchema, usernameSchema } from '@/features/auth/model/schemas'
import { profileQueryOptions, useProfileMutations } from '@/features/profile/api/profile'
import { AvatarField } from '@/features/profile/components/AvatarField'
import type { User } from '@/lib/api/contracts'
import { announce } from '@/lib/a11y/announce'

export const Route = createFileRoute('/_private/profile')({
  head: () => ({ meta: [{ title: 'Perfil · Kurio' }] }),
  component: ProfilePage,
})

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Use entre 2 e 60 caracteres').max(60, 'Use entre 2 e 60 caracteres'),
  username: usernameSchema,
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[a-z0-9-]{3,32}$/i.test(v), 'Use 3–32 letras, números ou hífen'),
  walletNickname: z.string().trim().min(2, 'Use entre 2 e 40 caracteres').max(40, 'Use entre 2 e 40 caracteres'),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem' })
type PasswordForm = z.infer<typeof passwordSchema>

function ProfilePage() {
  const user = useRequiredUser()
  const profile = useQuery(profileQueryOptions(user.id))
  return (
    <AccountLayout>
      <h1 className="mb-6 font-bold">Perfil do colecionador</h1>
      {profile.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[68px]" />
          ))}
        </div>
      ) : profile.isError ? (
        <QueryError title="Não foi possível carregar o perfil" error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
      ) : (
        <div className="space-y-12">
          <ProfileDataForm profile={profile.data} />
          <PasswordSection userId={user.id} />
        </div>
      )}
    </AccountLayout>
  )
}

function ProfileDataForm({ profile }: { profile: User }) {
  const { update } = useProfileMutations(profile.id)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: toForm(profile) })
  const { errors, isDirty } = form.formState
  // Dados confirmados pelo servidor substituem o formulário (persistem após refresh).
  useEffect(() => form.reset(toForm(profile)), [profile, form])

  return (
    <form
      noValidate
      aria-label="Dados do perfil"
      onSubmit={form.handleSubmit((v) => {
        setFormError(null)
        update.mutate(v, {
          onSuccess: () => {
            toast.success('Perfil atualizado.')
            announce('Perfil atualizado.')
          },
          onError: (e) => setFormError(applyApiErrors(e, form.setError, ['name', 'username', 'email', 'ensName', 'walletNickname'])),
        })
      })}
      className="space-y-6"
    >
      <FormAlert>{formError}</FormAlert>
      <div className="grid gap-x-7 gap-y-5 sm:grid-cols-2">
        <Field label="Nome de exibição" required error={errors.name?.message}>
          {(a) => <Input {...a} autoComplete="name" {...form.register('name')} />}
        </Field>
        <Field label="Nome de usuário" required error={errors.username?.message}>
          {(a) => <Input {...a} autoComplete="username" {...form.register('username')} />}
        </Field>
        <Field label="E-mail" required error={errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Nome ENS" error={errors.ensName?.message} hint="Opcional. Sem o sufixo .eth.">
          {(a) => (
            <div className="flex">
              <span className="grid place-items-center rounded-l-md border border-r-0 border-input bg-surface-dark px-3 text-sm">.eth</span>
              <Input {...a} className="rounded-l-none" {...form.register('ensName')} />
            </div>
          )}
        </Field>
        <Field label="Apelido da carteira" required error={errors.walletNickname?.message}>
          {(a) => <Input {...a} {...form.register('walletNickname')} />}
        </Field>
        <AvatarField user={profile} />
      </div>
      <Button type="submit" size="lg" disabled={update.isPending || !isDirty}>
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function toForm(p: User): ProfileForm {
  return { name: p.name, username: p.username, email: p.email, ensName: p.ensName, walletNickname: p.walletNickname }
}

function PasswordSection({ userId }: { userId: string }) {
  const { password } = useProfileMutations(userId)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState
  return (
    <form
      noValidate
      aria-labelledby="password-title"
      className="max-w-[417px] space-y-5"
      onSubmit={form.handleSubmit(({ currentPassword, newPassword }) => {
        setFormError(null)
        password.mutate(
          { currentPassword, newPassword },
          {
            onSuccess: () => {
              form.reset()
              toast.success('Senha alterada. Outras sessões foram encerradas.')
              announce('Senha alterada.')
            },
            onError: (e) => setFormError(applyApiErrors(e, form.setError, ['currentPassword', 'newPassword'])),
          },
        )
      })}
    >
      <h2 id="password-title" className="font-bold">
        Alterar senha
      </h2>
      <FormAlert>{formError}</FormAlert>
      <Field label="Senha atual" error={errors.currentPassword?.message}>
        {(a) => <PasswordInput {...a} autoComplete="current-password" {...form.register('currentPassword')} />}
      </Field>
      <Field label="Nova senha" error={errors.newPassword?.message} hint="Mínimo de 8 caracteres, com letras, números e símbolo.">
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register('newPassword')} />}
      </Field>
      <Field label="Confirmar nova senha" error={errors.confirmPassword?.message}>
        {(a) => <PasswordInput {...a} autoComplete="new-password" {...form.register('confirmPassword')} />}
      </Field>
      <Button type="submit" size="lg" disabled={password.isPending}>
        {password.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}
