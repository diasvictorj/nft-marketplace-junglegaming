import { Link } from '@tanstack/react-router'
import { Heart, Home, Search, User } from 'lucide-react'
import { useSession } from '@/features/auth/hooks/useSession'
import { CartLink } from './CartLink'

const item = 'flex flex-col items-center gap-0.5 rounded-md p-2 text-text-secondary'
const active = { className: 'text-text-accent' }

/** Barra inferior do mobile (Figma "Tab Bar"). */
export function MobileTabBar() {
  const { isAuthenticated } = useSession()
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-1">
        <li className="grid place-items-center">
          <Link to="/" className={item} activeOptions={{ exact: true, includeSearch: false }} activeProps={active} aria-label="Início">
            <Home className="size-5" aria-hidden />
          </Link>
        </li>
        <li className="grid place-items-center">
          <Link
            to="/"
            search={{ favorites: true }}
            className={item}
            aria-label="Favoritos"
            activeOptions={{ exact: true, includeSearch: true }}
            activeProps={active}
          >
            <Heart className="size-5" aria-hidden />
          </Link>
        </li>
        <li className="grid place-items-center">
          <Link
            to="/"
            hash="busca"
            className="-mt-6 grid size-14 place-items-center rounded-full bg-primary text-ink shadow-lg"
            aria-label="Buscar NFTs"
          >
            <Search className="size-6" aria-hidden />
          </Link>
        </li>
        <li className="grid place-items-center">
          <CartLink className={item} />
        </li>
        <li className="grid place-items-center">
          <Link to={isAuthenticated ? '/profile' : '/login'} className={item} activeProps={active} aria-label={isAuthenticated ? 'Perfil' : 'Entrar'}>
            <User className="size-5" aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  )
}
