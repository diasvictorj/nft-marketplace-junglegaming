import { useId, useState } from 'react'
import { isApiError } from '@/lib/api/client'
import type { Cart, Quote } from '@/lib/api/contracts'
import { announce } from '@/lib/a11y/announce'
import { useCartMutations } from '../api/cart'

const COUPON_MESSAGES: Record<string, string> = {
  COUPON_INVALID: 'Cupom inválido. Confira o código e tente novamente.',
  COUPON_EXPIRED: 'Este cupom expirou.',
}

export function CouponForm({ cart, quote, compact = false }: { cart: Cart; quote?: Quote; compact?: boolean }) {
  const { applyCoupon, removeCoupon } = useCartMutations()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  if (cart.couponCode) {
    const invalid = quote?.couponError
    return (
      <div className="space-y-1 text-sm">
        <p className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Cupom <strong className="text-text-accent">{cart.couponCode}</strong> {invalid ? 'não pôde ser aplicado' : 'aplicado'}
          </span>
          <button
            type="button"
            className="text-xs text-text-accent underline underline-offset-4"
            disabled={removeCoupon.isPending}
            onClick={() => removeCoupon.mutate(undefined, { onSuccess: () => announce('Cupom removido.') })}
          >
            Remover cupom
          </button>
        </p>
        {invalid && (
          <p role="alert" className="text-xs text-destructive">
            {COUPON_MESSAGES[invalid]}
          </p>
        )}
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!code.trim()) return setError('Informe um código promocional.')
        setError(null)
        applyCoupon.mutate(code.trim(), {
          onSuccess: () => {
            setCode('')
            announce(`Cupom ${code.trim().toUpperCase()} aplicado.`)
          },
          onError: (err) =>
            setError(isApiError(err) ? (COUPON_MESSAGES[err.code ?? ''] ?? err.message) : 'Não foi possível aplicar o cupom.'),
        })
      }}
    >
      <label htmlFor={id} className={compact ? 'sr-only' : 'mb-2 block text-sm font-bold'}>
        Código promocional
      </label>
      <div className="flex">
        <input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional..."
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 min-w-0 flex-1 rounded-l-md border border-r-0 border-input bg-ink px-3 text-sm uppercase placeholder:normal-case placeholder:text-brand-secondary aria-invalid:border-destructive"
        />
        <button
          type="submit"
          disabled={applyCoupon.isPending}
          className="rounded-r-md bg-primary px-4 text-sm font-bold text-ink hover:bg-text-accent disabled:opacity-60"
        >
          {applyCoupon.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
