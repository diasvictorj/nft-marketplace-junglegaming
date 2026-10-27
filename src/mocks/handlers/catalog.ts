import Decimal from 'decimal.js'
import type { FeaturedResponse, Nft, NftFacets, NftSort, NftTab, Page } from '@/lib/api/contracts'
import { getDb, getScenario } from '../db/store'
import { CATALOG_NOW, CATEGORIES, NETWORKS } from '../db/seed'
import { findNft } from '../domain/commerce'
import { fail, requireAuth, route } from './http'

const NEW_WINDOW_MS = 30 * 86_400_000
const SORTS: NftSort[] = ['recent', 'price-asc', 'price-desc', 'name']
const TABS: NftTab[] = ['all', 'new', 'trending']

export const listPrice = (nft: Nft) => nft.editions.find((e) => e.id === nft.defaultEditionId)!.price

function parseDecimal(value: string | null, field: string) {
  if (value === null || value === '') return null
  try {
    const d = new Decimal(value.replace(',', '.'))
    if (d.isNegative() || !d.isFinite()) throw new Error()
    return d
  } catch {
    throw fail(400, 'VALIDATION_ERROR', `Parâmetro ${field} inválido.`, { fieldErrors: { [field]: 'Valor inválido' } })
  }
}

function catalog(): Nft[] {
  return getScenario().catalogEmpty ? [] : getDb().nfts
}

export const catalogHandlers = [
  route('get', '/nfts', ({ url, request }) => {
    const p = url.searchParams
    const q = p.get('q')?.trim().toLowerCase() ?? ''
    const categories = p.getAll('category')
    const networks = p.getAll('network')
    const min = parseDecimal(p.get('minPrice'), 'minPrice')
    const max = parseDecimal(p.get('maxPrice'), 'maxPrice')
    const sort = (p.get('sort') ?? 'recent') as NftSort
    const tab = (p.get('tab') ?? 'all') as NftTab
    const page = Number(p.get('page') ?? 1)
    const pageSize = Number(p.get('pageSize') ?? 9)
    if (!SORTS.includes(sort) || !TABS.includes(tab)) throw fail(400, 'VALIDATION_ERROR', 'Ordenação ou aba inválida.')
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) {
      throw fail(400, 'VALIDATION_ERROR', 'Paginação inválida.')
    }

    const favorites = p.get('favorites') === 'true' ? new Set(getDb().favorites[requireAuth(request).user.id] ?? []) : null

    let items = catalog().filter((n) => {
      if (favorites && !favorites.has(n.id)) return false
      if (q && !`${n.title} ${n.creator} ${n.collection}`.toLowerCase().includes(q)) return false
      if (categories.length && !categories.includes(n.category)) return false
      if (networks.length && !networks.includes(n.network)) return false
      const price = new Decimal(listPrice(n))
      if (min && price.lt(min)) return false
      if (max && price.gt(max)) return false
      if (tab === 'new' && Date.parse(n.createdAt) < CATALOG_NOW - NEW_WINDOW_MS) return false
      if (tab === 'trending' && !n.trending) return false
      return true
    })
    items = [...items].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return new Decimal(listPrice(a)).cmp(listPrice(b)) || a.id.localeCompare(b.id)
        case 'price-desc':
          return new Decimal(listPrice(b)).cmp(listPrice(a)) || a.id.localeCompare(b.id)
        case 'name':
          return a.title.localeCompare(b.title, 'pt-BR')
        default:
          return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
      }
    })
    const total = items.length
    const result: Page<Nft> = {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
    return result
  }),

  route('get', '/nfts/facets', () => {
    const nfts = catalog()
    const prices = nfts.map((n) => new Decimal(listPrice(n)))
    const facets: NftFacets = {
      categories: CATEGORIES.map((c) => ({ ...c, count: nfts.filter((n) => n.category === c.id).length })),
      networks: NETWORKS.map((c) => ({ ...c, count: nfts.filter((n) => n.network === c.id).length })),
      priceRange: {
        min: (prices.length ? Decimal.min(...prices) : new Decimal(0)).toFixed(2),
        max: (prices.length ? Decimal.max(...prices) : new Decimal(0)).toFixed(2),
      },
    }
    return facets
  }),

  route('get', '/nfts/featured', () => {
    const nfts = getDb().nfts
    const featured: FeaturedResponse = { hero: nfts[0]!, spotlight: nfts[1]! }
    return featured
  }),

  route<{ id: string }>('get', '/nfts/:id', ({ params }) => findNft(params.id)),
]
