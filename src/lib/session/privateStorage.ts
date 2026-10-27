/**
 * sessionStorage com dono: rascunhos e tentativas de checkout ficam associados ao
 * usuário e nunca são reaproveitados por outra conta. Logout/troca de usuário removem
 * tudo (prefixo kurio:private:); a expiração de sessão preserva para retomada.
 */
const PREFIX = 'kurio:private:'

export function readPrivate<T>(key: string, userId: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { userId: string; value: T }
    return parsed.userId === userId ? parsed.value : null
  } catch {
    return null
  }
}

export function writePrivate<T>(key: string, userId: string, value: T) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ userId, value }))
  } catch {
    /* noop */
  }
}

export function removePrivate(key: string) {
  try {
    sessionStorage.removeItem(PREFIX + key)
  } catch {
    /* noop */
  }
}

/** Remove dados privados; com `exceptUserId`, mantém os do próprio usuário. */
export function clearPrivateStorage(exceptUserId?: string) {
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (!key.startsWith(PREFIX)) continue
      if (exceptUserId) {
        const owner = (JSON.parse(sessionStorage.getItem(key) ?? '{}') as { userId?: string }).userId
        if (owner === exceptUserId) continue
      }
      sessionStorage.removeItem(key)
    }
  } catch {
    /* noop */
  }
}
