import Decimal from 'decimal.js'
import type { Edition, Network, Nft } from '@/lib/api/contracts'
import { demoUsers } from '../fixtures/users'
import { hashPassword } from './crypto'
import type { Db, DbUser, DbWallet } from './types'

/** Data de referência fixa: "Novos lançamentos" e datas do seed não dependem do relógio. */
export const CATALOG_NOW = Date.parse('2026-10-20T12:00:00Z')
const DAY = 86_400_000

export const CATEGORIES = [
  { id: 'arte-digital', label: 'Arte digital' },
  { id: 'fotografia', label: 'Fotografia' },
  { id: 'musica', label: 'Música' },
  { id: 'arte-3d', label: 'Arte 3D' },
  { id: 'colecionaveis', label: 'Colecionáveis' },
  { id: 'generativa', label: 'Generativa' },
  { id: 'jogos', label: 'Jogos' },
  { id: 'assinaturas', label: 'Assinaturas' },
  { id: 'utilidade', label: 'Utilidade' },
] as const

export const NETWORKS: { id: Network; label: string }[] = [
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'polygon', label: 'Polygon' },
  { id: 'solana', label: 'Solana' },
]

/** PRNG determinístico (mulberry32). */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ARTWORKS = {
  emerald: {
    src: '/assets/nfts/ape-emerald',
    alt: 'Ilustração de macaco de pelo castanho com óculos redondos verdes, jaqueta college verde e colar de esmeralda',
    collection: 'Kurio Apes',
    names: ['Emerald Ape #042', 'Jade Courier #311', 'Forest Regent #127', 'Verdant Prince #640', 'Moss Pilot #233', 'Malachite Kid #719', 'Clover Duke #054', 'Fern Herald #402', 'Pine Dreamer #865', 'Lime Voyager #190'],
  },
  sage: {
    src: '/assets/nfts/ape-sage',
    alt: 'Ilustração de gorila sorridente com chapéu bucket verde-sálvia e moletom roxo',
    collection: 'Nomad Club',
    names: ['Sage Nomad #089', 'Cosmic Bloom #118', 'Violet Nomad #314', 'Lilac Wanderer #476', 'Plum Drifter #027', 'Mauve Seeker #538', 'Orchid Monk #262', 'Lavender Scout #791', 'Iris Hermit #145', 'Amethyst Rover #903'],
  },
  ivory: {
    src: '/assets/nfts/ape-ivory',
    alt: 'Ilustração de macaco de pelo escuro com blazer marfim e gola alta verde-escura',
    collection: 'Baron Society',
    names: ['Neon Vessel #552', 'Ivory Baron #088', 'Onyx Curator #367', 'Ebony Counsel #614', 'Pearl Envoy #205', 'Obsidian Sage #839', 'Ash Diplomat #071', 'Shadow Patron #458', 'Coal Architect #326', 'Raven Broker #997'],
  },
  golden: {
    src: '/assets/nfts/ape-golden',
    alt: 'Ilustração de macaco dourado com fones de ouvido verdes e jaqueta creme',
    collection: 'Golden Frequencies',
    names: ['Golden Beat #207', 'Golden Signal #160', 'Amber Groove #384', 'Honey Tempo #521', 'Saffron Echo #048', 'Copper Rhythm #763', 'Brass Melody #219', 'Topaz Bassline #690', 'Ochre Chorus #135', 'Sunset Remix #872'],
  },
} as const

const CREATORS = ['Nova Sato', 'Iara Mendes', 'Theo Kubo', 'Lia Ferraz', 'Rafa Okoye']
const ATTRS = ['Óculos', 'Esmeralda', 'Raro', 'Chapéu', 'Moletom', 'Blazer', 'Fones', 'Dourado', 'Neon', 'Lendário']

/** Preços fixos do Figma para os NFTs exibidos no layout. */
const FIGMA_PRICES: Record<string, { price: string; compareAt?: string }> = {
  'Emerald Ape #042': { price: '1.19' },
  'Sage Nomad #089': { price: '1.69' },
  'Neon Vessel #552': { price: '1.99', compareAt: '2.29' },
  'Cosmic Bloom #118': { price: '1.29' },
  'Violet Nomad #314': { price: '1.39' },
  'Ivory Baron #088': { price: '1.79' },
  'Golden Beat #207': { price: '0.99' },
  'Golden Signal #160': { price: '0.39' },
}

const fix = (d: Decimal.Value) => new Decimal(d).toDecimalPlaces(4).toFixed(18)

function buildEditions(nftId: string, base: Decimal, rnd: () => number, index: number): Edition[] {
  const editions: Edition[] = [
    { id: `${nftId}-e1`, label: '1/1', price: fix(base.times(3)), supply: 1, available: index % 5 === 3 ? 0 : 1 },
    { id: `${nftId}-e10`, label: '1/10', price: fix(base.times(1.6)), supply: 10, available: 1 + Math.floor(rnd() * 9) },
    { id: `${nftId}-e50`, label: '1/50', price: fix(base), supply: 50, available: 5 + Math.floor(rnd() * 40) },
    { id: `${nftId}-open`, label: 'Aberta', price: fix(base.times(0.6)), supply: null, available: 999 },
  ]
  // Algumas obras não têm edição aberta e uma fica totalmente esgotada.
  if (index % 4 === 1) editions.pop()
  if (index === 13) for (const e of editions) e.available = 0
  return editions
}

export function seedNfts(): Nft[] {
  const rnd = mulberry32(7)
  const nfts: Nft[] = []
  const keys = Object.keys(ARTWORKS) as (keyof typeof ARTWORKS)[]
  // Intercala as obras para o grid inicial lembrar o Figma.
  const order: { art: keyof typeof ARTWORKS; name: string }[] = []
  for (let i = 0; i < 10; i++) for (const k of keys) order.push({ art: k, name: ARTWORKS[k].names[i]! })
  // Coloca os NFTs do layout no topo, na ordem do Figma.
  const figmaOrder = Object.keys(FIGMA_PRICES)
  order.sort((a, b) => {
    const ia = figmaOrder.indexOf(a.name)
    const ib = figmaOrder.indexOf(b.name)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  order.forEach(({ art, name }, i) => {
    const artwork = ARTWORKS[art]
    const id = `nft-${String(i + 1).padStart(3, '0')}`
    const token = name.split('#')[1] ?? String(i)
    const figma = FIGMA_PRICES[name]
    const base = new Decimal(figma?.price ?? (0.02 + rnd() * 12.28).toFixed(2))
    const editions = buildEditions(id, base, rnd, i)
    const category = art === 'golden' && i % 2 === 0 ? 'musica' : CATEGORIES[(i * 7) % CATEGORIES.length]!.id
    const network = NETWORKS[i % 3 === 2 ? 2 : i % 5 === 1 ? 1 : 0]!.id
    const attributes = [ATTRS[i % ATTRS.length]!, ATTRS[(i + 3) % ATTRS.length]!, i % 3 === 0 ? 'Raro' : 'Comum']
    nfts.push({
      id,
      tokenId: `#${token.padStart(4, '0')}`,
      title: name,
      creator: CREATORS[i % CREATORS.length]!,
      collection: artwork.collection,
      category,
      network,
      description: `${name} é uma obra digital finalizada à mão da coleção ${artwork.collection}. Cada atributo fica armazenado nos metadados do token e verificado na rede ${NETWORKS.find((n) => n.id === network)!.label}. A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência.`,
      attributes: [...new Set(attributes)],
      images: [0, 1, 2, 3].map((v) => ({ src: artwork.src, alt: v === 0 ? artwork.alt : `${artwork.alt} — vista ${v + 1}` })),
      editions,
      defaultEditionId: editions.find((e) => e.label === '1/50')!.id,
      compareAtPrice: figma?.compareAt ? fix(figma.compareAt) : null,
      rating: 4 + Math.round(rnd() * 10) / 10,
      reviewCount: 3 + Math.floor(rnd() * 40),
      trending: i % 3 === 0,
      createdAt: new Date(CATALOG_NOW - Math.floor(i * 2.3 * DAY)).toISOString(),
      version: 1,
    })
  })
  // Emerald Ape #042 conforme o Figma: edição 1/50 com avaliação 5 e 19 reviews.
  nfts[0]!.rating = 5
  nfts[0]!.reviewCount = 19
  return nfts
}

async function seedUsers(): Promise<DbUser[]> {
  return Promise.all(
    demoUsers.map(async (u, i) => {
      const salt = `kurio-salt-${u.id}`
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        ensName: i === 0 ? 'ana-coleciona' : '',
        walletNickname: i === 0 ? 'Cofre da Ana' : 'Carteira do Bruno',
        avatarUrl: null,
        salt,
        passwordHash: await hashPassword(u.demoPassword, salt),
      }
    }),
  )
}

function seedWallets(): DbWallet[] {
  return [
    { id: 'w-ana-1', userId: 'u1', label: 'MetaMask principal', address: '0x7A42c1F0b3E5d9A8c2B4e6F1a3D5c7E9b1A319E8', network: 'ethereum', provider: 'metamask', kind: 'primary' },
    { id: 'w-ana-2', userId: 'u1', label: 'Coinbase reserva', address: '0x3B91d2E4f6A8c0B2d4F6e8A0c2E4a6C8e0B2d4F6', network: 'polygon', provider: 'coinbase', kind: 'secondary' },
    { id: 'w-bruno-1', userId: 'u2', label: 'WalletConnect', address: '0x9C13e5A7b9D1f3B5d7F9a1C3e5A7c9E1a3C5e7A9', network: 'ethereum', provider: 'walletconnect', kind: 'primary' },
  ]
}

export async function createSeed(): Promise<Db> {
  return {
    schema: 2,
    users: await seedUsers(),
    sessions: [],
    nfts: seedNfts(),
    favorites: { u1: ['nft-002', 'nft-006'], u2: ['nft-003'] },
    carts: {},
    quotes: {},
    orders: [],
    idempotency: {},
    wallets: seedWallets(),
    coupons: [
      { code: 'KURIO10', kind: 'percent', value: '10', expiresAt: '2099-12-31T23:59:59Z' },
      { code: 'GENESIS', kind: 'fixed', value: '0.1', expiresAt: '2099-12-31T23:59:59Z' },
      { code: 'VERAO24', kind: 'percent', value: '15', expiresAt: '2024-03-01T00:00:00Z' },
    ],
    flags: { driftApplied: false },
    seq: { order: 1000, quote: 0, wallet: 10, user: 10 },
  }
}
