import type {
  ChangePasswordRequest,
  Network,
  UpdateAvatarRequest,
  UpdateProfileRequest,
  Wallet,
  WalletInput,
  WalletProvider,
} from '@/lib/api/contracts'
import { hashPassword, randomId } from '../db/crypto'
import { getDb, getScenario, mutate } from '../db/store'
import type { DbWallet } from '../db/types'
import { EMAIL_RE, passwordIssues, toUser, USERNAME_RE } from './auth'
import { created, fail, noContent, readJson, requireAuth, route, validation, type Auth } from './http'

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const PROVIDERS: WalletProvider[] = ['metamask', 'walletconnect', 'coinbase']
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const AVATAR_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const AVATAR_MAX_CHARS = 400_000

/** Cenário "unauthorized": dados de conta respondem 403. */
function requireAccount(request: Request): Auth {
  const auth = requireAuth(request)
  if (getScenario().forbidPrivate) throw fail(403, 'FORBIDDEN', 'Você não tem permissão para acessar estes dados.')
  return auth
}

function toWallet(w: DbWallet, auth: Auth): Wallet {
  const { userId: _u, ...rest } = w
  return { ...rest, connected: auth.session.connectedWallets.includes(w.id) }
}

function validateWallet(input: Partial<WalletInput>, userId: string, selfId?: string) {
  const errors: Record<string, string> = {}
  if (!input.label || input.label.trim().length < 2 || input.label.length > 40) errors.label = 'Use entre 2 e 40 caracteres'
  if (!input.address || !ADDRESS_RE.test(input.address)) errors.address = 'Endereço deve ter o formato 0x seguido de 40 caracteres hexadecimais'
  if (!input.network || !NETWORKS.includes(input.network)) errors.network = 'Selecione uma rede'
  if (!input.provider || !PROVIDERS.includes(input.provider)) errors.provider = 'Selecione o tipo de carteira'
  if (input.kind !== 'primary' && input.kind !== 'secondary') errors.kind = 'Selecione principal ou secundária'
  const dup = getDb().wallets.find(
    (w) => w.userId === userId && w.id !== selfId && w.address.toLowerCase() === input.address?.toLowerCase(),
  )
  if (dup) errors.address = 'Este endereço já está cadastrado'
  if (Object.keys(errors).length) throw validation(errors)
}

export const accountHandlers = [
  route('get', '/profile', ({ request }) => toUser(requireAccount(request).user)),

  route('patch', '/profile', async ({ request }) => {
    const { user } = requireAccount(request)
    const body = await readJson<UpdateProfileRequest>(request)
    const errors: Record<string, string> = {}
    if (!body.name || body.name.trim().length < 2 || body.name.length > 60) errors.name = 'Use entre 2 e 60 caracteres'
    if (!body.username || !USERNAME_RE.test(body.username)) errors.username = 'Use 3–20 letras, números, "_" ou "."'
    if (!body.email || !EMAIL_RE.test(body.email)) errors.email = 'Informe um e-mail válido'
    if ((body.bio ?? '').length > 280) errors.bio = 'Máximo de 280 caracteres'
    if (Object.keys(errors).length) throw validation(errors)
    const db = getDb()
    const email = body.email.trim().toLowerCase()
    if (db.users.some((u) => u.id !== user.id && u.email.toLowerCase() === email)) {
      throw fail(409, 'EMAIL_CONFLICT', 'Este e-mail já pertence a outra conta.', { fieldErrors: { email: 'E-mail já cadastrado' } })
    }
    if (db.users.some((u) => u.id !== user.id && u.username.toLowerCase() === body.username.toLowerCase())) {
      throw fail(409, 'EMAIL_CONFLICT', 'Nome de usuário em uso.', { fieldErrors: { username: 'Nome de usuário já está em uso' } })
    }
    return mutate(() => {
      user.name = body.name.trim()
      user.username = body.username.trim()
      user.email = email
      user.bio = (body.bio ?? '').trim()
      return toUser(user)
    })
  }),

  route('put', '/profile/avatar', async ({ request }) => {
    const { user } = requireAccount(request)
    const { dataUrl } = await readJson<UpdateAvatarRequest>(request)
    if (dataUrl !== null) {
      if (typeof dataUrl !== 'string' || !AVATAR_RE.test(dataUrl)) {
        throw validation({ avatar: 'Envie uma imagem PNG, JPEG ou WebP' })
      }
      if (dataUrl.length > AVATAR_MAX_CHARS) throw validation({ avatar: 'A imagem deve ter no máximo 300 KB' })
    }
    return mutate(() => {
      user.avatarUrl = dataUrl
      return toUser(user)
    })
  }),

  route('post', '/profile/password', async ({ request }) => {
    const { user, session } = requireAccount(request)
    const body = await readJson<ChangePasswordRequest>(request)
    if (!body.currentPassword || (await hashPassword(body.currentPassword, user.salt)) !== user.passwordHash) {
      throw validation({ currentPassword: 'Senha atual incorreta' })
    }
    const issue = passwordIssues(body.newPassword)
    if (issue) throw validation({ newPassword: issue })
    if (body.newPassword === body.currentPassword) throw validation({ newPassword: 'A nova senha deve ser diferente da atual' })
    const salt = randomId('salt')
    const hash = await hashPassword(body.newPassword, salt)
    mutate((db) => {
      user.salt = salt
      user.passwordHash = hash
      // Encerra as outras sessões do usuário.
      db.sessions = db.sessions.filter((s) => s.userId !== user.id || s.token === session.token)
    })
    return noContent()
  }),

  route('get', '/wallets', ({ request }) => {
    const auth = requireAccount(request)
    return getDb()
      .wallets.filter((w) => w.userId === auth.user.id)
      .map((w) => toWallet(w, auth))
  }),

  route('post', '/wallets', async ({ request }) => {
    const auth = requireAccount(request)
    const body = await readJson<WalletInput>(request)
    validateWallet(body, auth.user.id)
    const mine = getDb().wallets.filter((w) => w.userId === auth.user.id)
    // Cada colecionador tem no máximo uma carteira principal e uma secundária.
    if (mine.some((w) => w.kind === body.kind)) {
      throw fail(409, 'VALIDATION_ERROR', `Você já tem uma carteira ${body.kind === 'primary' ? 'principal' : 'secundária'}. Edite-a.`, {
        fieldErrors: { kind: 'Já existe uma carteira deste tipo' },
      })
    }
    const wallet = mutate((db) => {
      const w: DbWallet = { id: randomId('w'), userId: auth.user.id, ...pick(body) }
      db.wallets.push(w)
      return w
    })
    return created(toWallet(wallet, auth))
  }),

  route<{ id: string }>('patch', '/wallets/:id', async ({ request, params }) => {
    const auth = requireAccount(request)
    const wallet = getDb().wallets.find((w) => w.id === params.id)
    if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.userId !== auth.user.id) throw fail(403, 'FORBIDDEN', 'Esta carteira pertence a outro usuário.')
    const body = await readJson<WalletInput>(request)
    validateWallet(body, auth.user.id, wallet.id)
    return mutate((db) => {
      if (body.kind !== wallet.kind) {
        // Troca de papel: a outra carteira assume o papel oposto.
        for (const w of db.wallets) if (w.userId === auth.user.id && w.id !== wallet.id && w.kind === body.kind) w.kind = wallet.kind
      }
      Object.assign(wallet, pick(body))
      return toWallet(wallet, auth)
    })
  }),

  route<{ id: string }>('post', '/wallets/:id/connect', ({ request, params }) => {
    const auth = requireAuth(request)
    const wallet = getDb().wallets.find((w) => w.id === params.id && w.userId === auth.user.id)
    if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (getScenario().walletRejects) throw fail(409, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    return mutate(() => {
      if (!auth.session.connectedWallets.includes(wallet.id)) auth.session.connectedWallets.push(wallet.id)
      return toWallet(wallet, auth)
    })
  }),

  route<{ id: string }>('post', '/wallets/:id/disconnect', ({ request, params }) => {
    const auth = requireAuth(request)
    const wallet = getDb().wallets.find((w) => w.id === params.id && w.userId === auth.user.id)
    if (!wallet) throw fail(404, 'NOT_FOUND', 'Carteira não encontrada.')
    return mutate(() => {
      auth.session.connectedWallets = auth.session.connectedWallets.filter((id) => id !== wallet.id)
      return toWallet(wallet, auth)
    })
  }),
]

function pick(body: WalletInput) {
  return {
    label: body.label.trim(),
    address: body.address,
    network: body.network,
    provider: body.provider,
    kind: body.kind,
  }
}
