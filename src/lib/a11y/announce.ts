/**
 * Anuncia mensagens na região aria-live global (#live-region) — feedback acessível
 * para mutations e alterações em tempo real que não têm foco associado.
 */
let timer: ReturnType<typeof setTimeout> | undefined

export function announce(message: string) {
  const region = document.getElementById('live-region')
  if (!region) return
  // Limpa antes para que mensagens repetidas sejam lidas novamente.
  region.textContent = ''
  clearTimeout(timer)
  timer = setTimeout(() => {
    region.textContent = message
  }, 60)
}
