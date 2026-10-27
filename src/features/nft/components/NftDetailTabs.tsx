import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Nft } from '@/lib/api/contracts'

const NETWORK_LABEL = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

export function NftDetailTabs({ nft }: { nft: Nft }) {
  const trigger =
    'h-auto flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2 text-sm text-text-primary shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-text-accent'
  return (
    <Tabs defaultValue="details" className="gap-4">
      <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-primary/60 bg-transparent p-0">
        <TabsTrigger value="details" className={trigger}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={trigger}>
          Avaliações de colecionadores ({nft.reviewCount})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="space-y-4 text-sm leading-6 text-text-secondary">
        <p>{nft.description}</p>
        <div>
          <h3 className="font-bold text-text-primary">Rede:</h3>
          <p>Cunhado na {NETWORK_LABEL[nft.network]} com procedência imutável e metadados armazenados no IPFS.</p>
        </div>
        <div>
          <h3 className="font-bold text-text-primary">Contrato:</h3>
          <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
        </div>
        <div>
          <h3 className="font-bold text-text-primary">Criador:</h3>
          <p>{nft.creator} · Contrato inteligente ERC-721 verificado.</p>
        </div>
      </TabsContent>
      <TabsContent value="reviews" className="text-sm leading-6 text-text-secondary">
        <p>
          Nota média {nft.rating.toFixed(1)} de 5 em {nft.reviewCount} avaliações. Os comentários individuais não fazem parte desta
          demonstração.
        </p>
      </TabsContent>
    </Tabs>
  )
}
