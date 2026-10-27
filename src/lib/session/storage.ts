/**
 * Credenciais locais da sessão simulada. O token é opaco (nunca a senha) e fica no
 * localStorage para a sessão sobreviver a refresh; o id do carrinho do visitante
 * identifica o carrinho anônimo no servidor até o login.
 */
const TOKEN_KEY = 'kurio:token'
const CART_ID_KEY = 'kurio:cart-id'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage indisponível: sessão só em memória */
  }
}

let memoryToken: string | null = read(TOKEN_KEY)

export const sessionStorageKeys = { TOKEN_KEY, CART_ID_KEY }

export function getToken() {
  return memoryToken
}

export function setToken(token: string | null) {
  memoryToken = token
  write(TOKEN_KEY, token)
}

export function getGuestCartId() {
  let id = read(CART_ID_KEY)
  if (!id) {
    id = `cart-${crypto.randomUUID()}`
    write(CART_ID_KEY, id)
  }
  return id
}
