import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { QueryError } from '@/components/common/QueryError'
import { Button } from '@/components/ui/button'
import { useSession } from '@/features/auth/hooks/useSession'
import { cn } from '@/lib/utils'
import { CATALOG_PAGE_SIZE, nftListQueryOptions } from '../api/catalog'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { hasActiveFilters, toListParams } from '../model/search'
import { NftCard, NftCardSkeleton } from './NftCard'
import { Pagination } from './Pagination'

const grid = 'grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3 lg:gap-x-6'

export function CatalogResults() {
  const { search, update } = useCatalogSearch()
  const { user, isPending: sessionPending } = useSession()
  const params = toListParams(search)
  const needsLogin = !!params.favorites && !user && !sessionPending
  const query = useQuery({ ...nftListQueryOptions(params, user?.id ?? null), enabled: !params.favorites || !!user })
  const { data, isPending, isError, error, isPlaceholderData, isFetching, refetch } = query

  const goToPage = (page: number) => {
    update({ page })
    document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
  }

  if (needsLogin) {
    return (
      <div className="rounded-lg border border-border-soft bg-card p-8 text-center">
        <p className="font-bold">Entre para ver seus favoritos</p>
        <Button asChild className="mt-4">
          <Link to="/login" search={{ redirect: '/?favorites=true' }}>
            Entrar
          </Link>
        </Button>
      </div>
    )
  }

  if (isPending) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          Carregando NFTs…
        </p>
        <div className={grid}>
          {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return <QueryError title="Não foi possível carregar o catálogo" error={error} onRetry={() => void refetch()} retrying={isFetching} />
  }

  const updating = isPlaceholderData && isFetching
  return (
    <div className="space-y-8">
      <p role="status" className="text-xs text-text-secondary">
        {updating ? 'Atualizando resultados…' : `${data.total} ${data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}`}
      </p>
      {data.items.length === 0 ? (
        <div className="rounded-lg border border-border-soft bg-card p-8 text-center">
          <p className="font-bold">{params.favorites ? 'Você ainda não favoritou nenhum NFT.' : 'Nenhum NFT encontrado.'}</p>
          <p className="mt-2 text-sm text-text-secondary">
            {data.total > 0 ? 'Esta página não existe para a busca atual.' : 'Ajuste a busca ou os filtros para ver mais resultados.'}
          </p>
          {hasActiveFilters(search) || data.total > 0 ? (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() =>
                data.total > 0
                  ? goToPage(1)
                  : update({ q: undefined, category: undefined, network: undefined, minPrice: undefined, maxPrice: undefined, tab: undefined, favorites: undefined })
              }
            >
              {data.total > 0 ? 'Ir para a primeira página' : 'Limpar filtros'}
            </Button>
          ) : null}
        </div>
      ) : (
        <ul aria-busy={updating} className={cn(grid, 'transition-opacity', updating && 'opacity-60')} aria-label="NFTs">
          {data.items.map((nft, i) => (
            <li key={nft.id}>
              <NftCard nft={nft} priority={i < 2} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
    </div>
  )
}
