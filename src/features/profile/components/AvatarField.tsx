import { ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { initials } from '@/components/layout/UserMenu'
import { isApiError } from '@/lib/api/client'
import type { User } from '@/lib/api/contracts'
import { announce } from '@/lib/a11y/announce'
import { useProfileMutations } from '../api/profile'

const TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/** Redimensiona no cliente (256 px, WebP) para manter o avatar leve no estado simulado. */
async function toAvatarDataUrl(file: File) {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/webp', 0.85)
}

export function AvatarField({ user }: { user: User }) {
  const { avatar } = useProfileMutations(user.id)
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!TYPES.includes(file.type)) return setError('Envie uma imagem PNG, JPEG ou WebP.')
    if (file.size > MAX_BYTES) return setError('A imagem deve ter no máximo 5 MB.')
    try {
      const dataUrl = await toAvatarDataUrl(file)
      avatar.mutate(dataUrl, {
        onSuccess: () => {
          toast.success('Avatar atualizado.')
          announce('Avatar atualizado.')
        },
        onError: (e) => setError(isApiError(e) ? (e.fieldErrors?.avatar ?? e.message) : 'Falha ao enviar o avatar.'),
      })
    } catch {
      setError('Não foi possível ler esta imagem.')
    }
  }

  return (
    <div className="space-y-2">
      <p id="avatar-label" className="text-sm">
        Avatar
      </p>
      <div className="flex items-center gap-4" role="group" aria-labelledby="avatar-label">
        <Avatar className="size-14 border border-border-soft">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={`Avatar de ${user.name}`} />}
          <AvatarFallback className="bg-surface-dark text-text-accent">
            {user.avatarUrl ? initials(user.name) : <ImageIcon className="size-5" aria-label="Sem avatar" />}
          </AvatarFallback>
        </Avatar>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(',')}
          className="sr-only"
          id="avatar-input"
          aria-describedby={error ? 'avatar-error' : undefined}
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={avatar.isPending}>
          {avatar.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        {user.avatarUrl && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={avatar.isPending}
            onClick={() => avatar.mutate(null, { onSuccess: () => toast.success('Avatar removido.') })}
          >
            Remover
          </Button>
        )}
      </div>
      {error && (
        <p id="avatar-error" role="alert" className="text-xs text-destructive">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
