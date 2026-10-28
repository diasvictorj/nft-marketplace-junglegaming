import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { NftImage } from '@/components/common/NftImage'
import { notifyUnavailable } from '@/components/common/Unavailable'
import { Button } from '@/components/ui/button'
import { featuredQueryOptions } from '../api/catalog'

const HERO_IMAGE = {
  src: '/assets/nfts/ape-emerald',
  alt: 'Emerald Ape #042: macaco com óculos redondos verdes e jaqueta college verde',
}

/** Hero de marketing (arte estática do Figma; é o elemento LCP e é pré-carregado). */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden rounded-2xl bg-card md:bg-transparent">
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-4 p-5 min-[360px]:grid-cols-[minmax(0,1fr)_8rem] sm:grid-cols-[minmax(0,1fr)_9rem] md:grid-cols-[1fr_400px] md:items-center md:gap-6 md:p-0 lg:gap-16">
        <div className="md:pl-4">
          <p className="text-xs md:text-sm">Bem-vindo à Kurio</p>
          <h1 id="hero-title" className="mt-2 text-lg leading-snug font-bold md:mt-3 md:text-display md:leading-[4.375rem]">
            SEJA DONO DO FUTURO DA ARTE DIGITAL
          </h1>
          <p className="mt-3 max-w-md text-xs leading-5 text-text-secondary md:mt-4 md:text-sm md:leading-6">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
            tenha uma parte da cultura da internet.
          </p>
          <Button asChild className="mt-6 px-5 md:px-8">
            <a href="#catalogo">
              EXPLORAR <ArrowRight aria-hidden />
            </a>
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl md:rounded-2xl">
          <NftImage image={HERO_IMAGE} sizes="(min-width: 768px) 400px, 144px" priority />
        </div>
      </div>
    </section>
  )
}

export function Spotlight() {
  const { data, isPending } = useQuery(featuredQueryOptions)
  const nft = data?.spotlight
  return (
    <section aria-labelledby="spotlight-title" className="overflow-hidden rounded-lg bg-surface-dark">
      <div className="p-4">
        <h2 id="spotlight-title" className="font-bold text-text-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="mt-1 text-center text-sm font-bold">OFERTA LIMITADA</p>
      </div>
      {isPending || !nft ? (
        <div className="skeleton aspect-square w-full rounded-none" aria-hidden />
      ) : (
        <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block" aria-label={`Ver ${nft.title}, NFT em destaque`}>
          <NftImage image={nft.images[0]!} sizes="260px" className="rounded-t-2xl" />
        </Link>
      )}
    </section>
  )
}

const promos = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: { src: '/assets/nfts/ape-emerald', alt: '' },
    search: { tab: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a sua identidade.',
    image: { src: '/assets/nfts/ape-ivory', alt: '' },
    search: { category: ['arte-digital'] },
  },
]

export function Promos() {
  return (
    <section aria-label="Coleções em destaque" className="grid gap-6 md:grid-cols-2">
      {promos.map((p) => (
        <article key={p.title} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] overflow-hidden rounded-lg bg-card">
          <NftImage image={p.image} sizes="250px" decorative className="h-full" />
          <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
            <h2 className="text-sm font-bold">{p.title}</h2>
            <p className="text-xs leading-5 text-text-secondary">{p.text}</p>
            <Button asChild size="sm">
              <Link to="/" search={p.search} hash="catalogo">
                Explorar <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  )
}

const posts = [
  { date: '12 de setembro', read: '6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.', image: 'ape-ivory' },
  { date: '15 de setembro', read: '2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.', image: 'ape-emerald' },
  { date: '15 de setembro', read: '3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.', image: 'ape-sage' },
  { date: '15 de setembro', read: '2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.', image: 'ape-golden' },
]

/** Blog editorial (fora do escopo): conteúdo estático; "Ler mais" avisa indisponibilidade. */
export function Blog() {
  return (
    <section aria-labelledby="blog-title">
      <h2 id="blog-title" className="text-center text-xl font-bold md:text-2xl">
        Diário da Cunhagem
      </h2>
      <p className="mt-3 text-center text-xs text-text-secondary">
        Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {posts.map((p) => (
          <li key={p.title}>
            <article className="h-full overflow-hidden rounded-lg bg-card">
              <img
                src={`/assets/nfts/${p.image}-thumb.webp`}
                alt=""
                width={320}
                height={200}
                loading="lazy"
                decoding="async"
                className="h-36 w-full object-cover object-top"
              />
              <div className="space-y-2 p-3">
                <p className="text-[0.625rem] text-text-secondary">
                  {p.date} | Leitura de {p.read}
                </p>
                <h3 className="text-sm font-bold">{p.title}</h3>
                <p className="text-xs text-text-secondary">{p.text}</p>
                <button type="button" className="text-xs text-text-accent hover:underline" onClick={() => notifyUnavailable('O blog')}>
                  Ler mais →<span className="sr-only"> sobre {p.title}</span>
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
