import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { NftSort, NftTab } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { SORT_LABELS, TAB_LABELS } from '../model/search'

export function CatalogTabs({ className }: { className?: string }) {
  const { search, update } = useCatalogSearch()
  const current = search.tab ?? 'all'
  return (
    <div role="group" aria-label="Listas do catálogo" className={cn('flex gap-4 overflow-x-auto', className)}>
      {(Object.keys(TAB_LABELS) as NftTab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          aria-pressed={current === tab}
          onClick={() => update({ tab })}
          className={cn(
            'shrink-0 border-b-2 border-transparent pb-1 text-xs whitespace-nowrap text-text-primary hover:text-text-accent',
            current === tab && 'border-primary font-bold text-text-accent',
          )}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  )
}

export function SortSelect() {
  const { search, update } = useCatalogSearch()
  return (
    <div className="flex items-center gap-2 text-xs">
      <span id="sort-label">Ordenar por:</span>
      <Select value={search.sort ?? 'recent'} onValueChange={(v) => update({ sort: v as NftSort })}>
        <SelectTrigger aria-labelledby="sort-label" size="sm" className="h-8 border-none bg-transparent px-1 text-xs text-text-accent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORT_LABELS) as NftSort[]).map((s) => (
            <SelectItem key={s} value={s}>
              {SORT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
