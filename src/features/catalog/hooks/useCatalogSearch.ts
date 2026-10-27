import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback } from 'react'
import type { CatalogSearch } from '../model/search'

/**
 * Lê e atualiza o estado do catálogo na URL. Qualquer mudança de busca/filtro/
 * ordenação reinicia a paginação; só `page` explícito a preserva.
 */
export function useCatalogSearch() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const update = useCallback(
    (patch: Partial<CatalogSearch>, opts?: { replace?: boolean }) =>
      navigate({
        search: (prev) => {
          const next = { ...prev, ...patch, page: 'page' in patch ? patch.page : undefined }
          // URL limpa: remove chaves vazias/padrão.
          for (const [k, v] of Object.entries(next)) {
            if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0) || v === false) delete next[k as keyof typeof next]
          }
          if (next.page === 1) delete next.page
          if (next.sort === 'recent') delete next.sort
          if (next.tab === 'all') delete next.tab
          return next
        },
        replace: opts?.replace,
        resetScroll: false,
      }),
    [navigate],
  )
  return { search, update }
}
