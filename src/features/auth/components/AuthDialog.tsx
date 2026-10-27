import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { notifyUnavailable } from '@/components/common/Unavailable'
import { cn } from '@/lib/utils'
import { safeRedirect } from '../model/schemas'

/**
 * Login/Cadastro como diálogo sobre a página (Figma desktop) e tela cheia no mobile.
 * São rotas próprias (acesso direto/refresh); fechar volta ao destino de origem.
 * O Dialog (Radix) prende o foco e fecha com Esc.
 */
export function AuthDialog({
  mode,
  redirect,
  description,
  children,
}: {
  mode: 'login' | 'signup'
  redirect?: string
  description: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const close = () => void navigate({ href: safeRedirect(redirect) })
  const tab = 'text-lg font-bold md:text-xl'
  return (
    <>
      <div aria-hidden className="min-h-[75vh]" />
      <div aria-hidden className="fixed inset-0 -z-0 bg-[url('/assets/nfts/ape-emerald-lg.webp')] bg-cover bg-center opacity-10 blur-sm" />
      <Dialog open onOpenChange={(open) => !open && close()}>
        <DialogContent
          className="max-h-dvh w-full max-w-full overflow-y-auto rounded-none border-0 bg-ink p-0 sm:max-w-[500px] md:rounded-lg md:border md:border-border md:bg-card"
          onOpenAutoFocus={(e) => {
            // Foco inicial no primeiro campo do formulário.
            e.preventDefault()
            ;(e.currentTarget as HTMLElement | null)?.querySelector<HTMLInputElement>('input')?.focus()
          }}
        >
          <div className="px-7 pt-16 pb-10 md:px-20 md:pt-12">
            <p className="mb-12 text-center text-3xl font-bold tracking-[0.15em] md:hidden" aria-hidden>
              KURIO
            </p>
            <div className="flex items-center justify-center gap-2">
              <DialogTitle asChild>
                <h1 className={cn(tab, 'text-text-accent')}>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
              </DialogTitle>
              <span aria-hidden className="h-5 w-px bg-primary" />
              <Link
                to={mode === 'login' ? '/signup' : '/login'}
                search={{ redirect }}
                replace
                className={cn(tab, 'text-text-primary hover:text-text-accent')}
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </Link>
            </div>
            <DialogDescription className="mt-6 text-center text-sm text-text-primary">{description}</DialogDescription>
            <div className="mt-8">{children}</div>
            <div className="mt-8 flex items-center gap-3 text-xs" aria-hidden>
              <span className="h-px flex-1 bg-border-soft" />
              Ou continue com
              <span className="h-px flex-1 bg-border-soft" />
            </div>
            <div className="mt-3 space-y-3">
              {(['Google', 'Facebook'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => notifyUnavailable(`O login com ${provider}`)}
                  className="flex h-10 w-full items-center justify-center gap-3 rounded-md border border-border text-sm text-text-secondary hover:bg-surface-dark"
                >
                  <span aria-hidden className="font-bold text-text-primary">
                    {provider[0]}
                  </span>
                  Continuar com {provider}
                </button>
              ))}
            </div>
          </div>
          <div aria-hidden className="hidden h-2.5 bg-primary md:block" />
        </DialogContent>
      </Dialog>
    </>
  )
}
