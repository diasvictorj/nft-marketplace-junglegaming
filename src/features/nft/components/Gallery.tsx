import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { NftImage } from '@/components/common/NftImage'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { NftImage as NftImageData } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

/** Galeria: miniaturas (botões com aria-pressed) + imagem principal com ampliação em diálogo. */
export function Gallery({ images, title }: { images: NftImageData[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const current = images[index] ?? images[0]!
  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      <ul className="flex gap-3 md:flex-col" aria-label="Miniaturas">
        {images.map((img, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              aria-label={`Ver imagem ${i + 1} de ${images.length}`}
              className={cn('block w-16 overflow-hidden rounded-md border-2 border-transparent md:w-[62px]', i === index && 'border-primary')}
            >
              <NftImage image={img} sizes="64px" decorative />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative flex-1 rounded-lg bg-card p-3">
        <NftImage image={current} sizes="(min-width: 768px) 260px, 90vw" priority className="rounded-xl" />
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-ink/80 hover:bg-ink"
          aria-label="Ampliar imagem"
        >
          <ZoomIn className="size-4" aria-hidden />
        </button>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[min(90vw,720px)] bg-card p-3">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{current.alt}</DialogDescription>
          <NftImage image={current} sizes="720px" className="rounded-lg" />
        </DialogContent>
      </Dialog>
    </div>
  )
}
