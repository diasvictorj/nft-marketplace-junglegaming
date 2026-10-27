import { delay, http, HttpResponse, type DefaultBodyType, type PathParams } from 'msw'
import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/contracts'
import { env } from '@/lib/env'
import { mulberry32 } from '../db/seed'
import { getDb, getScenario, onReset } from '../db/store'
import type { DbSession, DbUser } from '../db/types'

/**
 * Infra comum dos handlers REST: latência (com PRNG seeded), falhas injetadas
 * pelo cenário, autenticação por Bearer e respostas de erro padronizadas.
 */

export class HttpError extends Error {
  readonly status: number
  readonly body: ApiErrorBody
  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.body = body
  }
}

export const fail = (status: number, code: ApiErrorCode, message: string, extra?: Partial<ApiErrorBody>) =>
  new HttpError(status, { code, message, ...extra })

export const validation = (fieldErrors: Record<string, string>, message = 'Verifique os campos destacados.') =>
  fail(422, 'VALIDATION_ERROR', message, { fieldErrors })

/* ---------- Latência e falhas determinísticas ---------- */
let rnd = mulberry32(42)
let catalogRequestCount = 0
const faultHits = new Map<string, number>()

export function resetNetworkState() {
  rnd = mulberry32(getScenario().seed)
  catalogRequestCount = 0
  faultHits.clear()
}
onReset(resetNetworkState)

async function applyLatency(method: string, path: string) {
  const s = getScenario()
  let ms = s.latencyMs + (s.jitterMs ? Math.floor(rnd() * s.jitterMs) : 0)
  if (s.outOfOrder && method === 'GET' && path === '/nfts') {
    // Requisições ímpares demoram mais: a resposta antiga chega depois da nova.
    catalogRequestCount++
    ms = catalogRequestCount % 2 === 1 ? 1600 : 150
  }
  if (ms > 0) await delay(ms)
}

function matchFault(method: string, path: string) {
  const faults = getScenario().faults ?? []
  for (const [i, f] of faults.entries()) {
    if ((f.method === '*' || f.method === method) && f.path.test(path)) {
      const key = `${i}`
      const hits = faultHits.get(key) ?? 0
      if (hits >= f.times) return null
      faultHits.set(key, hits + 1)
      return f
    }
  }
  return null
}

/* ---------- Autenticação ---------- */
export interface Auth {
  user: DbUser
  session: DbSession
}

function bearer(request: Request) {
  const header = request.headers.get('authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/** Sessão válida ou null (visitante). Token expirado/inválido gera 401. */
export function optionalAuth(request: Request): Auth | null {
  const token = bearer(request)
  if (!token) return null
  const db = getDb()
  const session = db.sessions.find((s) => s.token === token)
  if (!session) throw fail(401, 'INVALID_SESSION', 'Sessão inválida. Entre novamente.')
  if (session.expiresAt <= Date.now()) throw fail(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.')
  const user = db.users.find((u) => u.id === session.userId)
  if (!user) throw fail(401, 'INVALID_SESSION', 'Sessão inválida. Entre novamente.')
  return { user, session }
}

export function requireAuth(request: Request): Auth {
  const auth = optionalAuth(request)
  if (!auth) throw fail(401, 'INVALID_SESSION', 'Faça login para continuar.')
  return auth
}

/** Identificador do carrinho: usuário autenticado ou visitante (X-Cart-Id). */
export function cartOwner(request: Request, auth: Auth | null): string {
  if (auth) return `user:${auth.user.id}`
  const guest = request.headers.get('x-cart-id')
  if (!guest || !/^[\w-]{8,64}$/.test(guest)) throw fail(400, 'VALIDATION_ERROR', 'Carrinho de visitante sem identificador.')
  return `guest:${guest}`
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw fail(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido.')
  }
}

/* ---------- Registro de rotas ---------- */
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
type Resolver<P extends PathParams> = (ctx: {
  request: Request
  params: P
  url: URL
}) => Promise<Response | DefaultBodyType> | Response | DefaultBodyType

const API = env.apiBaseUrl.replace(/\/$/, '')

export function route<P extends PathParams = PathParams>(method: Method, path: string, resolver: Resolver<P>) {
  return http[method]<P>(`${API}${path}`, async ({ request, params }) => {
    const url = new URL(request.url)
    const relPath = url.pathname.slice(API.length)
    const upper = method.toUpperCase()
    await applyLatency(upper, relPath)
    const fault = matchFault(upper, relPath)
    if (fault?.kind === 'network') return HttpResponse.error()
    if (fault) {
      return HttpResponse.json(
        {
          code: fault.code ?? 'TRANSIENT_FAILURE',
          message: (fault.status ?? 500) >= 500 ? 'Serviço temporariamente indisponível.' : 'Requisição recusada pelo servidor.',
          retryable: (fault.status ?? 500) >= 500,
        } satisfies ApiErrorBody,
        { status: fault.status ?? 500 },
      )
    }
    try {
      const result = await resolver({ request, params: params as P, url })
      if (result instanceof Response) return result
      return HttpResponse.json(result as never)
    } catch (e) {
      if (e instanceof HttpError) return HttpResponse.json(e.body, { status: e.status })
      console.error('[mocks] erro no handler', e)
      return HttpResponse.json({ code: 'TRANSIENT_FAILURE', message: 'Erro interno simulado.', retryable: true }, { status: 500 })
    }
  })
}

export const created = (body: unknown) => HttpResponse.json(body as never, { status: 201 })
export const noContent = () => new HttpResponse(null, { status: 204 })
