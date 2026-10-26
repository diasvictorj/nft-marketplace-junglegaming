/**
 * Usuários fictícios (mínimo de dois). Senhas NUNCA em claro: o mock guarda apenas
 * o hash (SHA-256 com salt fixo, suficiente para a simulação) — ver mocks/db.
 * Credenciais de demonstração estão documentadas no README.
 */
export const demoUsers = [
  { id: 'u1', name: 'Ana Colecionadora', email: 'ana@example.com', demoPassword: 'Senha@123' },
  { id: 'u2', name: 'Bruno Colecionador', email: 'bruno@example.com', demoPassword: 'Senha@456' },
] as const
