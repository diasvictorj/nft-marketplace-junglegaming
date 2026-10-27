import { createFileRoute } from '@tanstack/react-router'
import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { facetsQueryOptions, featuredQueryOptions, nftListQueryOptions } from '@/features/catalog/api/catalog'
import { CatalogTabs, SortSelect } from '@/features/catalog/components/CatalogToolbar'
import { CatalogResults } from '@/features/catalog/components/CatalogResults'
import { FilterPanel } from '@/features/catalog/components/FilterPanel'
import { Blog, Hero, Promos, Spotlight } from '@/features/catalog/components/HomeSections'
import { SearchField } from '@/features/catalog/components/SearchField'
import { catalogSearchSchema, toListParams } from '@/features/catalog/model/search'

/**
 * Busca, filtros, ordenação e paginação vivem na URL (fonte única de verdade).
 * Mudança de filtro reinicia `page` (useCatalogSearch).
 */
export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toListParams(search),
  loader: ({ context: { queryClient }, deps }) => {
    // Pré-busca sem bloquear a navegação: os skeletons cobrem o carregamento.
    if (!deps.favorites) void queryClient.prefetchQuery(nftListQueryOptions(deps, null))
    void queryClient.prefetchQuery(facetsQueryOptions)
    void queryClient.prefetchQuery(featuredQueryOptions)
  },
  head: () => ({ meta: [{ title: 'Kurio · Marketplace de NFTs' }] }),
  component: HomePage,
})

function HomePage() {
  const [filtersOpen, setFiltersOpen] = useState(false)
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 pt-4 md:space-y-24 md:pt-6 xl:px-0">
      <div className="flex gap-3 md:hidden">
        <SearchField className="flex-1" />
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetTrigger className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-ink" aria-label="Abrir filtros">
            <SlidersHorizontal className="size-5" aria-hidden />
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filtros</SheetTitle>
              <SheetDescription>Combine coleção, preço e rede. A lista é atualizada a cada escolha.</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-8">
              <SortSelect />
              <FilterPanel onApplied={() => setFiltersOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Hero />

      <section id="catalogo" aria-labelledby="catalog-title" className="scroll-mt-4 md:grid md:grid-cols-[220px_1fr] md:gap-8 lg:grid-cols-[260px_1fr]">
        <h2 id="catalog-title" className="sr-only">
          Catálogo de NFTs
        </h2>
        <aside className="hidden space-y-8 md:block" aria-label="Filtros do catálogo">
          <div className="rounded-lg bg-card p-5">
            <FilterPanel />
          </div>
          <Spotlight />
        </aside>
        <div className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CatalogTabs />
            <div className="hidden items-center gap-4 md:flex">
              <SearchField id="busca-desktop" className="w-56" />
              <SortSelect />
            </div>
          </div>
          <CatalogResults />
        </div>
      </section>

      <Promos />
      <Blog />
    </div>
  )
}
