import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogIn, LogOut, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { dropSession, logout } from '@/features/auth/api/session'
import { useSession } from '@/features/auth/hooks/useSession'

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => logout(),
    // Mesmo que a API falhe (ex.: sessão já expirada), a sessão local é encerrada.
    onSettled: () => {
      dropSession(queryClient)
      toast.success('Você saiu da sua conta.')
      void navigate({ to: '/' })
    },
  })
}

export function UserMenu() {
  const { user, isPending } = useSession()
  const logoutMutation = useLogout()
  const redirect = useReturnPath()

  if (isPending) return <div className="skeleton h-9 w-24" aria-hidden />
  if (!user) {
    return (
      <Button asChild size="sm" className="gap-1.5">
        <Link to="/login" search={{ redirect }}>
          <LogIn aria-hidden />
          Entrar
        </Link>
      </Button>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-2">
        <span className="sr-only">Menu da conta de {user.name}</span>
        <Avatar className="size-9 border border-primary" aria-hidden>
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="bg-surface-dark text-xs font-bold text-text-accent">{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User aria-hidden /> Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/wallets">
            <Wallet aria-hidden /> Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
          <LogOut aria-hidden /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Página atual como destino de retorno após o login. */
export function useReturnPath() {
  const { pathname, searchStr } = useLocation()
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) return undefined
  return pathname + searchStr
}
