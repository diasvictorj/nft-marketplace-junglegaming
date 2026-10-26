import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-3">
        Pular para o conteúdo
      </a>
      {/* TODO(layout): Header/Footer conforme Figma (components/layout) */}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      {/* Região live global para feedback acessível de mutations e eventos em tempo real. */}
      <div id="live-region" role="status" aria-live="polite" className="sr-only-live" />
    </div>
  )
}

function NotFound() {
  return (
    <section className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">O endereço acessado não existe.</p>
      <Link to="/" search={{ sort: 'relevance', page: 1 }} className="mt-6 inline-block underline">
        Voltar ao início
      </Link>
    </section>
  )
}
