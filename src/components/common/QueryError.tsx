import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

/** Estado de erro padrão com ação de nova tentativa. */
export function QueryError({
  title,
  error,
  onRetry,
  retrying,
  className,
}: {
  title: string
  error: unknown
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  const message = isApiError(error)
    ? error.isNetwork
      ? 'Sem conexão com o servidor. Verifique sua rede e tente novamente.'
      : error.message
    : 'Ocorreu um erro inesperado.'
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-card p-8 text-center', className)}>
      <AlertTriangle className="size-8 text-text-accent" aria-hidden />
      <p className="font-bold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} disabled={retrying} variant="outline" className="mt-2">
          <RotateCw className={cn(retrying && 'animate-spin')} aria-hidden />
          {retrying ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      )}
    </div>
  )
}
