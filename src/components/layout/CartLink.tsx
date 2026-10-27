import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/features/cart/api/cart'
import { cn } from '@/lib/utils'

export function CartLink({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return (
    <Link
      to="/cart"
      className={cn('relative inline-flex items-center gap-2 rounded-md p-2 text-text-primary hover:text-text-accent', className)}
      activeProps={{ className: 'text-text-accent' }}
      aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
    >
      <ShoppingCart className="size-5" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-0.5 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4 text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
      {showLabel && <span className="text-xs">Carrinho</span>}
    </Link>
  )
}
