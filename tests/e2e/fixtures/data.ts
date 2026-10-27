/** Dados estáveis do seed (src/mocks/db/seed.ts) usados nos testes. */
export const users = {
  ana: { id: 'u1', name: 'Ana Colecionadora', email: 'ana@example.com', password: 'Senha@123' },
  bruno: { id: 'u2', name: 'Bruno Colecionador', email: 'bruno@example.com', password: 'Senha@456' },
}
export type DemoUser = (typeof users)[keyof typeof users]

export const nfts = {
  emerald: { id: 'nft-001', title: 'Emerald Ape #042', edition: 'nft-001-e50', price: '1.19 ETH' },
  sage: { id: 'nft-002', title: 'Sage Nomad #089', edition: 'nft-002-e50', price: '1.69 ETH' },
  neon: { id: 'nft-003', title: 'Neon Vessel #552', edition: 'nft-003-e50', price: '1.99 ETH' },
  /** Todas as edições esgotadas. */
  soldOut: { id: 'nft-014' },
}
