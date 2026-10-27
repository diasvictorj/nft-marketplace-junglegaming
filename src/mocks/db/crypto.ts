/** Hash de senha da simulação: SHA-256(salt:senha) via Web Crypto. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(new Uint8Array(digest))
}

export function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomId(prefix: string, bytes = 8) {
  return `${prefix}_${toHex(crypto.getRandomValues(new Uint8Array(bytes)))}`
}

/** Hash não criptográfico (FNV-1a 32 bits) para impressões digitais de cotação. */
export function fingerprint(value: unknown): string {
  const text = JSON.stringify(value)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
