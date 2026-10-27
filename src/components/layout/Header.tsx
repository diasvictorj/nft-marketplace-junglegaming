import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { notifyUnavailable } from '@/components/common/Unavailable'
import { cn } from '@/lib/utils'
import { CartLink } from './CartLink'
import { Logo } from './Logo'
import { UserMenu } from './UserMenu'

const navLink = 'relative py-2 text-sm text-text-primary hover:text-text-accent'
const activeNav =
  'font-bold text-text-accent after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded after:bg-primary'

/** "Mercado" fica ativo nas telas do fluxo de compra (como no Figma). */
const MARKET_PATHS = /^\/(nfts|cart|checkout|orders)/

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()
  const inMarket = MARKET_PATHS.test(pathname)
  return (
    <header className="mx-auto hidden h-16 w-full max-w-[1200px] items-center justify-between px-4 md:flex xl:px-0">
      <Logo />
      <nav aria-label="Principal" className="flex items-center gap-8">
        <Link to="/" className={cn(navLink, pathname === '/' && activeNav)} aria-current={pathname === '/' ? 'page' : undefined}>
          Início
        </Link>
        <Link to="/" hash="catalogo" className={cn(navLink, inMarket && activeNav)}>
          Mercado
        </Link>
        <button type="button" className={navLink} onClick={() => notifyUnavailable('A seção Criadores')}>
          Criadores
        </button>
        <button type="button" className={navLink} onClick={() => notifyUnavailable('A seção Aprenda')}>
          Aprenda
        </button>
      </nav>
      <div className="flex items-center gap-3">
        {searchOpen ? (
          <HeaderSearch onClose={() => setSearchOpen(false)} />
        ) : (
          <button
            type="button"
            className="rounded-md p-2 hover:text-text-accent"
            aria-label="Buscar NFTs"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-5" aria-hidden />
          </button>
        )}
        <CartLink />
        <UserMenu />
      </div>
    </header>
  )
}

function HeaderSearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => inputRef.current?.focus(), [])
  return (
    <form
      role="search"
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault()
        const q = inputRef.current?.value.trim()
        void navigate({ to: '/', search: { q: q || undefined }, hash: 'catalogo' })
        onClose()
      }}
    >
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="header-search"
        ref={inputRef}
        type="search"
        placeholder="Buscar NFTs…"
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className={cn('h-9 w-56 rounded-md border border-input bg-ink px-3 text-sm placeholder:text-brand-secondary')}
      />
      <button type="button" className="rounded-md p-2" aria-label="Fechar busca" onClick={onClose}>
        <X className="size-4" aria-hidden />
      </button>
    </form>
  )
}
