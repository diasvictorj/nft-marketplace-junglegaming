import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Seletor de quantidade inteira com limites; o valor é anunciado ao mudar. */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label = 'Quantidade',
  disabled,
  size = 'md',
  className,
}: {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  const id = useId()
  const btn = cn(
    'grid place-items-center rounded-full bg-primary text-ink hover:bg-text-accent disabled:cursor-not-allowed disabled:bg-surface-dark disabled:text-text-secondary',
    size === 'sm' ? 'size-6' : 'size-7',
  )
  return (
    <div role="group" aria-labelledby={`${id}-label`} className={cn('inline-flex items-center gap-3', className)}>
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label={`Diminuir ${label.toLowerCase()}`}>
        <Minus className="size-3.5" aria-hidden />
      </button>
      <output aria-live="polite" className="min-w-5 text-center tabular-nums">
        {value}
      </output>
      <button type="button" className={btn} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label={`Aumentar ${label.toLowerCase()}`}>
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}
