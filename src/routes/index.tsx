import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

/**
 * Busca, filtros, ordenação e paginação vivem na URL (fonte única de verdade).
 * Mudança de filtro reinicia `page` — regra aplicada em features/catalog.
 */
export const catalogSearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  minPrice: z.string().optional().catch(undefined),
  maxPrice: z.string().optional().catch(undefined),
  sort: z.enum(['relevance', 'price-asc', 'price-desc', 'newest']).catch('relevance'),
  page: z.coerce.number().int().min(1).catch(1),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">Início</h1>
      <p className="text-muted-foreground">TODO: destaques, catálogo, busca, filtros e ordenação.</p>
    </section>
  )
}
