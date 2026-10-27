/** Variáveis de ambiente tipadas (todas prefixadas com VITE_). */
export const env = {
  /** Ativa a camada MSW (REST + Socket.IO) no navegador. */
  mocksEnabled: import.meta.env.VITE_ENABLE_MOCKS === 'true',
  /** Cenário inicial dos mocks (ver src/mocks/scenarios). */
  defaultScenario: import.meta.env.VITE_MOCK_SCENARIO ?? 'success',
  /** Base das chamadas REST. */
  apiBaseUrl: import.meta.env.VITE_API_URL ?? '/api',
  /**
   * URL do servidor Socket.IO (interceptado pelo MSW quando os mocks estão ativos).
   * Padrão: mesma origem da página, em ws(s)://.
   */
  socketUrl: import.meta.env.VITE_SOCKET_URL || window.location.origin.replace(/^http/, 'ws'),
} as const
