import { z } from 'zod'
import type { NftListParams, NftSort, NftTab } from '@/lib/api/contracts'
import { CATALOG_PAGE_SIZE } from '../api/catalog'

const decimal = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .optional()
  .catch(undefined)
const list = z.array(z.string().min(1)).max(20).optional().catch(undefined)

/**
 * Estado do catálogo na URL (fonte única de verdade): sobrevive a refresh e
 * navegação pelo histórico. Valores inválidos caem para o padrão.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: list,
  network: list,
  minPrice: decimal,
  maxPrice: decimal,
  sort: z.enum(['recent', 'price-asc', 'price-desc', 'name']).optional().catch(undefined),
  tab: z.enum(['all', 'new', 'trending']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(999).optional().catch(undefined),
  favorites: z.boolean().optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}
export const TAB_LABELS: Record<NftTab, string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export function toListParams(s: CatalogSearch): NftListParams {
  return {
    q: s.q || undefined,
    category: s.category?.length ? [...s.category].sort() : undefined,
    network: s.network?.length ? [...s.network].sort() : undefined,
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    sort: s.sort ?? 'recent',
    tab: s.tab ?? 'all',
    favorites: s.favorites || undefined,
    page: s.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}

export function hasActiveFilters(s: CatalogSearch) {
  return !!(s.q || s.category?.length || s.network?.length || s.minPrice || s.maxPrice || (s.tab && s.tab !== 'all') || s.favorites)
}
