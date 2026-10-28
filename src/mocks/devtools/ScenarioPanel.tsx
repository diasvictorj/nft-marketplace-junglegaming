import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { mockControl } from '../control'
import type { ScenarioId } from '../scenarios'

function reloadClean() {
  const url = new URL(window.location.href)
  url.searchParams.delete('scenario')
  window.location.replace(url.toString())
}

/**
 * Painel da simulação (somente com VITE_ENABLE_MOCKS=true). Troca cenários, reseta o
 * estado e dispara eventos pelo servidor Socket.IO simulado — nunca pelo cache da UI.
 */
export default function ScenarioPanel() {
  const [current, setCurrent] = useState<ScenarioId>(mockControl.scenario())
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => unknown, reload = false) => {
    setBusy(true)
    try {
      await fn()
      if (reload) reloadClean()
    } finally {
      setBusy(false)
    }
  }
  const firstCartLine = () => {
    const db = mockControl.snapshot()
    const cart = Object.values(db.carts).find((c) => c.items.length)
    return cart?.items[0]
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          data-testid="mock-panel"
          className="fixed top-1/3 left-0 z-50 flex items-center gap-1.5 rounded-r-md border border-l-0 border-border-soft bg-surface-dark px-3 py-0.5 text-[0.5625rem] leading-none whitespace-nowrap font-bold text-text-accent shadow-lg [writing-mode:vertical-rl]"
          aria-label={`Mocks · ${current}: abrir painel de simulação`}
        >
          <FlaskConical className="size-2.5 rotate-90" aria-hidden />
          Mocks · {current}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Simulação (MSW)</SheetTitle>
          <SheetDescription>Cenários determinísticos. Trocar o cenário restaura o estado conhecido e recarrega a página.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          <div className="space-y-2">
            <label htmlFor="mock-scenario" className="text-sm font-bold">
              Cenário
            </label>
            <select
              id="mock-scenario"
              value={current}
              onChange={(e) => setCurrent(e.target.value as ScenarioId)}
              className="h-11 w-full rounded-md border border-input bg-ink px-3 text-sm"
            >
              {mockControl.scenarios().map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.description}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => run(() => mockControl.setScenario(current), true)}>
                Aplicar cenário
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => run(() => mockControl.reset(), true)}>
                Resetar estado
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold">Eventos e falhas</p>
            <div className="grid gap-2">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() => {
                    const line = firstCartLine()
                    if (!line) return alert('Adicione um item ao carrinho primeiro.')
                    const nft = mockControl.snapshot().nfts.find((n) => n.id === line.nftId)!
                    const price = nft.editions.find((e) => e.id === line.editionId)!.price
                    mockControl.updateEdition(line.nftId, line.editionId, { price: (Number(price) * 1.1).toFixed(4) })
                  })
                }
              >
                Subir preço do 1º item do carrinho
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() => {
                    const line = firstCartLine()
                    if (!line) return alert('Adicione um item ao carrinho primeiro.')
                    mockControl.updateEdition(line.nftId, line.editionId, { available: 0 })
                  })
                }
              >
                Esgotar edição do 1º item
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => run(() => mockControl.replayLast('nft.updated'))}>
                Reenviar último nft.updated (duplicata)
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => run(() => mockControl.dropSocket(6000))}>
                Derrubar socket por 6 s
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => run(() => mockControl.expireSessions())}>
                Expirar sessão agora
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => run(() => mockControl.settlePendingOrders())}>
                Liquidar pedidos pendentes
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
