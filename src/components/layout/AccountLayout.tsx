import { Link } from '@tanstack/react-router'
import { Activity, AlertTriangle, Download, Heart, LogOut, MapPin, Tag, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLogout } from './UserMenu'

const item = 'flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-sm text-text-accent hover:bg-surface-dark'
const disabled = 'flex items-center gap-3 border-l-4 border-transparent px-4 py-3 text-sm text-text-secondary/70'

/** Navegação "Meu perfil". Itens fora do escopo aparecem desabilitados (não simulam sucesso). */
export function AccountLayout({ children }: { children: ReactNode }) {
  const logout = useLogout()
  return (
    <div className="mx-auto grid w-full max-w-[1200px] items-start gap-8 px-4 pt-4 pb-8 md:grid-cols-[240px_1fr] md:pt-8 lg:grid-cols-[310px_1fr] xl:px-0">
      <nav aria-label="Seções da conta" className="rounded-lg bg-card py-3">
        <h2 id="account-nav" className="px-4 pb-2 text-lg font-bold">
          Meu perfil
        </h2>
        <ul>
          <li>
            <Link to="/profile" className={item} activeProps={{ className: 'border-primary! bg-surface-dark' }}>
              <User className="size-4" aria-hidden /> Dados do perfil
            </Link>
          </li>
          <li>
            <Link to="/wallets" className={item} activeProps={{ className: 'border-primary! bg-surface-dark' }}>
              <MapPin className="size-4" aria-hidden /> Carteiras
            </Link>
          </li>
          <li>
            <Link to="/" search={{ favorites: true }} className={item}>
              <Heart className="size-4" aria-hidden /> Lista de interesse
            </Link>
          </li>
          {[
            ['Atividade', Activity],
            ['Ofertas', Tag],
            ['Arquivos baixados', Download],
            ['Suporte', AlertTriangle],
          ].map(([label, Icon]) => {
            const I = Icon as typeof Activity
            return (
              <li key={label as string} className={disabled} aria-disabled="true">
                <I className="size-4" aria-hidden /> {label as string}
                <span className="ml-auto text-[0.625rem]">em breve</span>
              </li>
            )
          })}
          <li className="mt-1 border-t border-border">
            <button type="button" onClick={() => logout.mutate()} disabled={logout.isPending} className={`${item} w-full font-bold`}>
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
