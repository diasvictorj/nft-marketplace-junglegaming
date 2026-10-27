import axios, { AxiosError } from 'axios'
import { env } from '@/lib/env'
import { getGuestCartId, getToken } from '@/lib/session/storage'
import type { ApiErrorBody } from './contracts'

/** Erro de domínio normalizado; a UI nunca lida com AxiosError diretamente. */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null
  readonly isNetwork: boolean
  readonly isTimeout: boolean
  constructor(status: number, body: ApiErrorBody | null, opts: { network?: boolean; timeout?: boolean; message?: string } = {}) {
    super(opts.message ?? body?.message ?? 'Erro inesperado')
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.isNetwork = opts.network ?? false
    this.isTimeout = opts.timeout ?? false
  }
  get code() {
    return this.body?.code
  }
  get fieldErrors() {
    return this.body?.fieldErrors
  }
  get retryable() {
    return this.isNetwork || this.isTimeout || this.status >= 500 || this.body?.retryable === true
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

/** Callback registrado pelo módulo de sessão para tratar sessão expirada/inválida. */
let onSessionExpired: ((code: string) => void) | null = null
export function setSessionExpiredHandler(fn: ((code: string) => void) | null) {
  onSessionExpired = fn
}

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
  // Arrays como parâmetros repetidos: ?category=a&category=b
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  config.headers.set('X-Cart-Id', getGuestCartId())
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    if (axios.isCancel(error)) throw error
    if (!error.response) {
      const timeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      throw new ApiError(0, null, {
        network: !timeout,
        timeout,
        message: timeout ? 'O servidor demorou para responder.' : 'Sem conexão com o servidor.',
      })
    }
    const { status, data } = error.response
    const body = data && typeof data === 'object' && 'code' in data ? data : null
    const hadToken = !!error.config?.headers?.Authorization
    if (status === 401 && hadToken && (body?.code === 'SESSION_EXPIRED' || body?.code === 'INVALID_SESSION')) {
      onSessionExpired?.(body.code)
    }
    throw new ApiError(status, body)
  },
)
