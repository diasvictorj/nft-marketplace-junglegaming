import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Campo de formulário acessível: label associado, `aria-invalid` e mensagem de
 * erro ligada por `aria-describedby`. `required` mostra o asterisco do Figma.
 */
export function Field({
  label,
  error,
  hint,
  required,
  hideLabel,
  className,
  children,
}: {
  label: string
  error?: string
  hint?: string
  required?: boolean
  hideLabel?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string; 'aria-required'?: boolean }) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={id} className={cn('block text-sm', hideLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          <span aria-hidden>⚠ </span>
          {error}
        </p>
      )}
    </div>
  )
}

/** Senha com alternância de visibilidade. */
export const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<'input'>>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-11" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded text-text-secondary hover:text-text-accent"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
})

/** Alerta de erro do formulário (erros gerais da API). */
export function FormAlert({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <div role="alert" className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {children}
    </div>
  )
}
