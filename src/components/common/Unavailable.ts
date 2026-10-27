import { toast } from 'sonner'

/**
 * Ações fora do escopo da entrega (editorial, suporte, login social, newsletter…).
 * Mostram um aviso honesto em vez de simular sucesso.
 */
export function notifyUnavailable(feature: string) {
  toast.info(`${feature} não está disponível nesta demonstração.`, { id: `unavailable-${feature}` })
}
