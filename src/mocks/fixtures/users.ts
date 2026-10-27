/**
 * Usuários fictícios (mínimo de dois). Senhas NUNCA em claro no estado simulado:
 * o seed guarda apenas SHA-256(salt:senha) — ver mocks/db/crypto.ts.
 * Credenciais de demonstração estão documentadas no README.
 */
export const demoUsers = [
  { id: 'u1', name: 'Ana Colecionadora', username: 'ana.coleciona', email: 'ana@example.com', demoPassword: 'Senha@123' },
  { id: 'u2', name: 'Bruno Colecionador', username: 'bruno_nft', email: 'bruno@example.com', demoPassword: 'Senha@456' },
] as const
