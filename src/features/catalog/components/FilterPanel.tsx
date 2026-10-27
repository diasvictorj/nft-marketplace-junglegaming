import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { FacetOption } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { facetsQueryOptions } from '../api/catalog'
import { useCatalogSearch } from '../hooks/useCatalogSearch'

function toggle(list: string[] | undefined, id: string) {
  const set = new Set(list ?? [])
  if (set.has(id)) set.delete(id)
  else set.add(id)
  return [...set]
}

function FacetList({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: FacetOption[] | undefined
  selected: string[] | undefined
  onToggle: (id: string) => void
}) {
  const id = useId()
  return (
    <fieldset>
      <legend id={id} className="mb-3 font-bold">
        {title}
      </legend>
      <ul className="space-y-1" aria-labelledby={id}>
        {options
          ? options.map((o) => {
              const active = selected?.includes(o.id) ?? false
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(o.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-dark hover:text-text-primary',
                      active && 'bg-surface-dark font-bold text-text-accent',
                    )}
                  >
                    <span>
                      {active && <span aria-hidden>✓ </span>}
                      {o.label}
                    </span>
                    <span aria-label={`${o.count} itens`}>({o.count})</span>
                  </button>
                </li>
              )
            })
          : Array.from({ length: 5 }, (_, i) => (
              <li key={i} aria-hidden className="skeleton h-7 w-full" />
            ))}
      </ul>
    </fieldset>
  )
}

/** Filtros combináveis (coleção, faixa de preço e rede). Cada mudança volta à página 1. */
export function FilterPanel({ onApplied }: { onApplied?: () => void }) {
  const { search, update } = useCatalogSearch()
  const { data: facets } = useQuery(facetsQueryOptions)
  const bounds = { min: Number(facets?.priceRange.min ?? 0), max: Number(facets?.priceRange.max ?? 13) }
  const [range, setRange] = useState<[number, number]>([0, 0])
  const minId = useId()
  const maxId = useId()

  useEffect(() => {
    setRange([
      search.minPrice ? Number(search.minPrice) : bounds.min,
      search.maxPrice ? Number(search.maxPrice) : bounds.max,
    ])
  }, [search.minPrice, search.maxPrice, bounds.min, bounds.max])

  const applyPrice = () => {
    const [lo, hi] = range[0] <= range[1] ? range : [range[1], range[0]]
    update({
      minPrice: lo > bounds.min ? lo.toFixed(2) : undefined,
      maxPrice: hi < bounds.max ? hi.toFixed(2) : undefined,
    })
    onApplied?.()
  }

  return (
    <div className="space-y-8">
      <FacetList
        title="Coleções"
        options={facets?.categories}
        selected={search.category}
        onToggle={(id) => update({ category: toggle(search.category, id) })}
      />
      <fieldset>
        <legend className="mb-4 font-bold">Faixa de preço</legend>
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={0.01}
          value={range}
          onValueChange={(v) => setRange([v[0] ?? bounds.min, v[1] ?? bounds.max])}
          aria-label="Faixa de preço"
          thumbLabels={['Preço mínimo', 'Preço máximo']}
        />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={minId} className="text-xs text-text-secondary">
              Mín. (ETH)
            </label>
            <input
              id={minId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={range[0]}
              onChange={(e) => setRange([Number(e.target.value), range[1]])}
              className="h-9 w-full rounded border border-input bg-ink px-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor={maxId} className="text-xs text-text-secondary">
              Máx. (ETH)
            </label>
            <input
              id={maxId}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={range[1]}
              onChange={(e) => setRange([range[0], Number(e.target.value)])}
              className="h-9 w-full rounded border border-input bg-ink px-2 text-sm"
            />
          </div>
        </div>
        <p className="mt-3 text-xs">
          Preço: {range[0].toFixed(2).replace('.', ',')} – {range[1].toFixed(2).replace('.', ',')} ETH
        </p>
        <Button size="sm" className="mt-3" onClick={applyPrice}>
          Aplicar
        </Button>
      </fieldset>
      <FacetList
        title="Rede"
        options={facets?.networks}
        selected={search.network}
        onToggle={(id) => update({ network: toggle(search.network, id) })}
      />
    </div>
  )
}
