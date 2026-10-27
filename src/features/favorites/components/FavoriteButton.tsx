import { useNavigate } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { useReturnPath } from '@/components/layout/UserMenu'
import { useSession } from '@/features/auth/hooks/useSession'
import { cn } from '@/lib/utils'
import { useFavorites, useToggleFavorite } from '../api/favorites'

/**
 * Botão de favorito (aria-pressed). Visitante é levado ao login e volta à página.
 * `variant="icon"` para cards; `variant="button"` para o detalhe (com rótulo).
 */
export function FavoriteButton({
  nftId,
  title,
  variant = 'icon',
  className,
}: {
  nftId: string
  title: string
  variant?: 'icon' | 'button'
  className?: string
}) {
  const { isAuthenticated } = useSession()
  const { isFavorite } = useFavorites()
  const toggle = useToggleFavorite()
  const navigate = useNavigate()
  const redirect = useReturnPath()
  const active = isFavorite(nftId)

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect } })
      return
    }
    toggle.mutate({ nftId, favorite: !active, title })
  }

  const label = active ? `Remover ${title} dos favoritos` : `Favoritar ${title}`
  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-primary px-4 text-sm font-bold text-text-accent hover:bg-surface-dark',
          className,
        )}
      >
        <Heart className={cn('size-4', active && 'fill-current')} aria-hidden />
        {active ? 'Favoritado' : 'Favoritar'}
        <span className="sr-only"> {title}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn('grid size-9 place-items-center rounded-full bg-ink/80 text-text-accent backdrop-blur hover:bg-ink', className)}
    >
      <Heart className={cn('size-4', active && 'fill-current')} aria-hidden />
    </button>
  )
}
