import { Link } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import { notifyUnavailable } from '@/components/common/Unavailable'
import { SocialIcon, type SocialNetwork } from './SocialIcons'

const features = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const socials: { label: string; href: string; icon: SocialNetwork }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com', icon: 'facebook' },
  { label: 'Instagram', href: 'https://www.instagram.com', icon: 'instagram' },
  { label: 'Twitter', href: 'https://x.com', icon: 'twitter' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: 'linkedin' },
  { label: 'YouTube', href: 'https://www.youtube.com', icon: 'youtube' },
]

/** Itens editoriais/suporte estão fora do escopo: aparecem como texto, não como links. */
function Muted({ children }: { children: string }) {
  return <li className="text-sm text-muted-foreground/80">{children}</li>
}

export function Footer() {
  const onSubscribe = (e: FormEvent) => {
    e.preventDefault()
    notifyUnavailable('A inscrição na newsletter')
  }
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1200px] px-4 pb-24 md:pb-6 xl:px-0">
      <div className="grid gap-8 rounded-t-lg bg-card p-6 md:grid-cols-4 md:p-10">
        {features.map((f) => (
          <div key={f.title} className="md:border-r md:border-primary md:pr-6">
            <span aria-hidden className="grid size-14 place-items-center rounded-full bg-primary text-lg font-bold text-ink">
              {f.letter}
            </span>
            <h2 className="mt-4 font-bold">{f.title}</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{f.text}</p>
          </div>
        ))}
        <form onSubmit={onSubscribe} aria-labelledby="newsletter-title">
          <h2 id="newsletter-title" className="font-bold">
            Antecipe-se ao próximo lançamento
          </h2>
          <div className="mt-4 flex">
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para a newsletter
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="digite seu e-mail..."
              className="h-10 min-w-0 flex-1 rounded-l-md bg-surface-dark px-3 text-sm placeholder:text-brand-secondary"
            />
            <button type="submit" className="rounded-r-md bg-primary px-4 font-bold text-ink hover:bg-text-accent">
              Enviar
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-text-secondary">
            Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
          </p>
        </form>
      </div>
      <div className="grid gap-2 bg-surface-dark px-6 py-6 text-sm md:grid-cols-4 md:items-center md:px-10">
        <span className="font-bold tracking-[0.2em]">KURIO</span>
        <span>Feito para colecionadores, criadores e cultura</span>
        <a href="mailto:contato@email.com" className="hover:text-text-accent">
          contato@email.com
        </a>
        <a href="tel:+551140028922" className="hover:text-text-accent">
          +55 11 4002 8922
        </a>
      </div>
      <div className="grid gap-8 rounded-b-lg bg-card px-6 py-8 sm:grid-cols-2 md:grid-cols-4 md:px-10">
        <nav aria-labelledby="f-profile">
          <h2 id="f-profile" className="font-bold">
            Meu perfil
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/profile" className="hover:text-text-accent">
                Meu perfil
              </Link>
            </li>
            <li>
              <Link to="/wallets" className="hover:text-text-accent">
                Minhas carteiras
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-text-accent">
                Carrinho
              </Link>
            </li>
            <Muted>Atividade</Muted>
            <Muted>Estúdio do criador</Muted>
          </ul>
        </nav>
        <div>
          <h2 className="font-bold">Central de ajuda</h2>
          <ul className="mt-3 space-y-2">
            <Muted>Central de ajuda</Muted>
            <Muted>Como comprar NFTs</Muted>
            <Muted>Carteira e segurança</Muted>
            <Muted>Política do mercado</Muted>
          </ul>
        </div>
        <nav aria-labelledby="f-collections">
          <h2 id="f-collections" className="font-bold">
            Coleções
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ['arte-digital', 'Arte digital'],
              ['fotografia', 'Fotografia'],
              ['musica', 'Música'],
              ['arte-3d', 'Arte 3D'],
              ['utilidade', 'Utilidade'],
            ].map(([id, label]) => (
              <li key={id}>
                <Link to="/" search={{ category: [id!] }} hash="catalogo" className="hover:text-text-accent">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-bold">Redes sociais</h2>
          <ul className="mt-3 flex gap-2">
            {socials.map(({ label, href, icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-8 place-items-center rounded border border-primary text-text-accent hover:bg-surface-dark"
                  aria-label={`${label} (abre em nova aba)`}
                >
                  <SocialIcon name={icon} className="size-4" />
                </a>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 font-bold">Carteiras compatíveis</h2>
          <p className="mt-3 inline-block rounded border border-border-soft bg-surface-dark px-3 py-1 text-[0.625rem] font-bold tracking-wide text-text-accent">
            METAMASK · WALLETCONNECT · COINBASE
          </p>
        </div>
      </div>
      <p className="mt-6 text-center text-xs">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
