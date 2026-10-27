import { useLocation, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Logo } from './Logo'

/** Cabeçalho compacto do mobile para telas internas (a home tem a própria barra de busca). */
export function MobileTopBar() {
  const { pathname } = useLocation()
  const router = useRouter()
  if (pathname === '/') return null
  return (
    <div className="flex h-14 items-center gap-3 px-4 md:hidden">
      <button type="button" onClick={() => router.history.back()} className="rounded-md p-2" aria-label="Voltar">
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <Logo />
    </div>
  )
}
