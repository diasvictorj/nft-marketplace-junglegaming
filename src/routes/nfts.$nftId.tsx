import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  return (
    <section className="p-6">
      <h1 className="text-3xl font-semibold">NFT {nftId}</h1>
      <p className="text-muted-foreground">TODO: galeria, edição, quantidade, favoritos e compra.</p>
    </section>
  )
}
