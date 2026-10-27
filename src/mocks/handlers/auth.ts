import type { LoginRequest, SessionResponse, SignupRequest, User } from '@/lib/api/contracts'
import { hashPassword, randomId } from '../db/crypto'
import { getDb, getScenario, mutate } from '../db/store'
import type { DbSession, DbUser } from '../db/types'
import { mergeGuestCart } from '../domain/commerce'
import { created, fail, noContent, optionalAuth, readJson, requireAuth, route, validation } from './http'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const USERNAME_RE = /^[a-z0-9_.]{3,20}$/i

export function toUser(u: DbUser): User {
  return { id: u.id, name: u.name, username: u.username, email: u.email, bio: u.bio, avatarUrl: u.avatarUrl }
}

export function passwordIssues(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) return 'A senha deve ter pelo menos 8 caracteres'
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use letras e números'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Inclua ao menos um símbolo'
  return null
}

function toSessionResponse(session: DbSession, user: DbUser): SessionResponse {
  return {
    user: toUser(user),
    token: session.token,
    sessionId: session.sessionId,
    expiresAt: new Date(session.expiresAt).toISOString(),
  }
}

function openSession(user: DbUser, guestCartId: string | null) {
  return mutate((db) => {
    const session: DbSession = {
      token: randomId('tok', 16),
      sessionId: randomId('ses'),
      userId: user.id,
      expiresAt: Date.now() + getScenario().sessionTtlMs,
      connectedWallets: [],
    }
    db.sessions.push(session)
    mergeGuestCart(guestCartId ? `guest:${guestCartId}` : null, `user:${user.id}`)
    return toSessionResponse(session, user)
  })
}

export const authHandlers = [
  route('get', '/session', ({ request }) => {
    const auth = optionalAuth(request)
    if (!auth) throw fail(401, 'INVALID_SESSION', 'Nenhuma sessão ativa.')
    return toSessionResponse(auth.session, auth.user)
  }),

  route('post', '/auth/login', async ({ request }) => {
    const body = await readJson<LoginRequest>(request)
    const errors: Record<string, string> = {}
    if (!body.email || !EMAIL_RE.test(body.email)) errors.email = 'Informe um e-mail válido'
    if (!body.password) errors.password = 'Informe a senha'
    if (Object.keys(errors).length) throw validation(errors)
    const user = getDb().users.find((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())
    if (!user || (await hashPassword(body.password, user.salt)) !== user.passwordHash) {
      throw fail(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    return openSession(user, request.headers.get('x-cart-id'))
  }),

  route('post', '/auth/signup', async ({ request }) => {
    const body = await readJson<SignupRequest>(request)
    const errors: Record<string, string> = {}
    if (body.name !== undefined && body.name.trim().length < 2) errors.name = 'Informe seu nome (mín. 2 caracteres)'
    if (!body.username || !USERNAME_RE.test(body.username)) errors.username = 'Use 3–20 letras, números, "_" ou "."'
    if (!body.email || !EMAIL_RE.test(body.email)) errors.email = 'Informe um e-mail válido'
    const pwd = passwordIssues(body.password)
    if (pwd) errors.password = pwd
    if (Object.keys(errors).length) throw validation(errors)

    const db = getDb()
    const email = body.email.trim().toLowerCase()
    if (getScenario().signupAlwaysConflicts || db.users.some((u) => u.email.toLowerCase() === email)) {
      throw fail(409, 'EMAIL_CONFLICT', 'Já existe uma conta com este e-mail.', {
        fieldErrors: { email: 'Este e-mail já está cadastrado' },
      })
    }
    if (db.users.some((u) => u.username.toLowerCase() === body.username.toLowerCase())) {
      throw fail(409, 'EMAIL_CONFLICT', 'Nome de usuário em uso.', { fieldErrors: { username: 'Este nome de usuário já está em uso' } })
    }
    const salt = randomId('salt')
    const passwordHash = await hashPassword(body.password, salt)
    const user = mutate((d) => {
      const u: DbUser = {
        id: `u${++d.seq.user}`,
        name: body.name?.trim() || body.username.trim(),
        username: body.username.trim(),
        email,
        bio: '',
        avatarUrl: null,
        salt,
        passwordHash,
      }
      d.users.push(u)
      return u
    })
    return created(openSession(user, request.headers.get('x-cart-id')))
  }),

  route('post', '/auth/logout', ({ request }) => {
    const auth = requireAuth(request)
    mutate((db) => {
      db.sessions = db.sessions.filter((s) => s.token !== auth.session.token)
    })
    return noContent()
  }),
]
