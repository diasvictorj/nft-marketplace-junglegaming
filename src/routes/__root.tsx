import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { Toaster } from '@/components/ui/sonner'
import { SessionWatcher } from '@/features/auth/components/SessionWatcher'
import { env } from '@/lib/env'
import { RealtimeBridge } from '@/lib/realtime/RealtimeBridge'

export interface RouterContext {
  queryClient: QueryClient
}

const ScenarioPanel = env.mocksEnabled ? lazy(() => import('@/mocks/devtools/ScenarioPanel')) : null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-bold text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <MobileTopBar />
      <main id="main" tabIndex={-1} className="min-h-dvh flex-1 outline-none">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      {/* Região live global para feedback acessível de mutations e eventos em tempo real. */}
      <div id="live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only-live" />
      <Toaster />
      <RealtimeBridge />
      <SessionWatcher />
      {ScenarioPanel && (
        <Suspense fallback={null}>
          <ScenarioPanel />
        </Suspense>
      )}
    </div>
  )
}

export function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-6xl font-bold text-text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
      <Link to="/" className="mt-6 inline-block font-bold text-text-accent underline underline-offset-4">
        Voltar ao início
      </Link>
    </section>
  )
}
