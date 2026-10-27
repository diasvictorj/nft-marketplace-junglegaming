import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useCatalogSearch } from '../hooks/useCatalogSearch'

/** Busca com debounce (350 ms) sincronizada com `?q=`; voltar no histórico restaura o texto. */
export function SearchField({ className, id = 'busca' }: { className?: string; id?: string }) {
  const { search, update } = useCatalogSearch()
  const [value, setValue] = useState(search.q ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const { hash } = useLocation()

  useEffect(() => setValue(search.q ?? ''), [search.q])
  useEffect(() => {
    if (hash === id) inputRef.current?.focus()
  }, [hash, id])

  useEffect(() => {
    const next = value.trim()
    if (next === (search.q ?? '')) return
    const t = setTimeout(() => update({ q: next || undefined }), 350)
    return () => clearTimeout(t)
  }, [value, search.q, update])

  return (
    <div role="search" className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs por nome, criador ou coleção
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-secondary" aria-hidden />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') update({ q: value.trim() || undefined })
        }}
        placeholder="Explorar coleções"
        className="h-11 w-full rounded-lg border border-input bg-card pr-3 pl-10 text-sm placeholder:text-text-secondary"
      />
    </div>
  )
}
