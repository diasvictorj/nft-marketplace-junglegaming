import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from '@/lib/api/client'

/**
 * Mapeia `fieldErrors` da API para os campos do formulário. Retorna a mensagem
 * geral (quando não há erro por campo conhecido) para exibir em um alerta.
 */
export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly Path<T>[]) {
  if (!isApiError(error)) return 'Ocorreu um erro inesperado. Tente novamente.'
  let mapped = false
  for (const [field, message] of Object.entries(error.fieldErrors ?? {})) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message }, { shouldFocus: !mapped })
      mapped = true
    }
  }
  if (mapped && error.code === 'VALIDATION_ERROR') return null
  if (error.isNetwork) return 'Sem conexão com o servidor. Tente novamente.'
  return error.message
}
