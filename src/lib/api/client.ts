import axios, { AxiosError } from 'axios'
import { env } from '@/lib/env'
import type { ApiErrorBody } from './contracts'

/** Erro de domínio normalizado; a UI nunca lida com AxiosError diretamente. */
export class ApiError extends Error {
  readonly status: number
  readonly body: ApiErrorBody | null
  readonly isNetwork: boolean
  constructor(status: number, body: ApiErrorBody | null, isNetwork = false, message?: string) {
    super(message ?? body?.message ?? 'Erro inesperado')
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.isNetwork = isNetwork
  }
  get code() {
    return this.body?.code
  }
  get retryable() {
    return this.isNetwork || this.status >= 500 || this.body?.retryable === true
  }
}

/** Callback registrado pelo módulo de sessão para tratar 401/expiração. */
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn
}

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 8000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    if (axios.isCancel(error)) throw error
    if (!error.response) {
      throw new ApiError(0, null, true, 'Sem conexão com o servidor')
    }
    const { status, data } = error.response
    if (status === 401) onSessionExpired?.()
    throw new ApiError(status, data ?? null)
  },
)
