import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Loader2, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { applyApiErrors } from '@/components/form/applyApiErrors'
import { Field, FormAlert } from '@/components/form/Field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useRequiredUser } from '@/features/auth/hooks/useSession'
import { useCart, useQuote } from '@/features/cart/api/cart'
import { CouponForm } from '@/features/cart/components/CouponForm'
import { QuoteSummary } from '@/features/cart/components/QuoteSummary'
import { OrderItems } from '@/features/checkout/components/OrderItems'
import { QuoteChangedDialog } from '@/features/checkout/components/QuoteChangedDialog'
import { shortAddress, WalletPicker } from '@/features/checkout/components/WalletPicker'
import { usePlaceOrder } from '@/features/checkout/hooks/usePlaceOrder'
import { DRAFT_KEY, getAttempt } from '@/features/checkout/model/attempt'
import { collectorSchema, NETWORK_OPTIONS, PROVIDER_LABEL, toCollectorInfo, type CollectorForm } from '@/features/checkout/model/schema'
import { pendingOrdersQueryOptions } from '@/features/orders/api/orders'
import { walletsQueryOptions } from '@/features/wallets/api/wallets'
import { http, isApiError } from '@/lib/api/client'
import type { CreateOrderRequest, Network, Quote } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money/eth'
import { readPrivate, writePrivate } from '@/lib/session/privateStorage'

export const Route = createFileRoute('/_private/checkout')({
  head: () => ({ meta: [{ title: 'Pagamento · Kurio' }] }),
  component: CheckoutPage,
})

type Draft = CollectorForm & { walletId: string | null }

function CheckoutPage() {
  const user = useRequiredUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cart = useCart()
  const wallets = useQuery(walletsQueryOptions(user.id))
  const pending = useQuery(pendingOrdersQueryOptions(user.id))
  const place = usePlaceOrder(user.id)

  const draft = useRef(readPrivate<Draft>(DRAFT_KEY, user.id)).current
  const form = useForm<CollectorForm>({
    resolver: zodResolver(collectorSchema),
    defaultValues: draft ?? {
      displayName: user.name,
      username: user.username,
      network: 'ethereum',
      profileName: user.name,
      secondaryAddress: '',
      referralCode: '',
      email: user.email,
      ensName: '',
      note: '',
    },
  })
  const { errors } = form.formState
  const network = form.watch('network') as Network
  const [walletId, setWalletId] = useState<string | null>(draft?.walletId ?? null)
  const [walletError, setWalletError] = useState<string>()
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  const [changed, setChanged] = useState<{ previous: Quote; next: Quote } | null>(null)
  const [submitError, setSubmitError] = useState<{ message: string; retry: boolean } | null>(null)
  const [revalidating, setRevalidating] = useState(false)
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const quote = useQuote(network, cart.data)

  // Seleciona a carteira principal por padrão.
  const walletList = wallets.data ?? []
  useEffect(() => {
    if (!walletId && walletList.length) setWalletId((walletList.find((w) => w.kind === 'primary') ?? walletList[0]!).id)
  }, [walletId, walletList])
  const wallet = walletList.find((w) => w.id === walletId)

  // Rascunho em sessionStorage (retomada após expiração de sessão/refresh).
  useEffect(() => {
    const sub = form.watch((values) => writePrivate(DRAFT_KEY, user.id, { ...values, walletId }))
    writePrivate(DRAFT_KEY, user.id, { ...form.getValues(), walletId })
    return () => sub.unsubscribe()
  }, [form, user.id, walletId])

  useEffect(() => {
    if (step === 'review') reviewHeading.current?.focus()
  }, [step])

  // Enquanto revisa, a cotação ao vivo (atualizada por eventos) pode divergir da revisada.
  const stale = step === 'review' && reviewed && quote.data && quote.data.hash !== reviewed.hash

  const goToReview = form.handleSubmit(() => {
    if (!wallet) return setWalletError('Selecione uma carteira cadastrada.')
    if (!wallet.connected) return setWalletError('Conecte a carteira selecionada para continuar.')
    if (!quote.data || quote.data.blocked) return
    setWalletError(undefined)
    setSubmitError(null)
    setReviewed(quote.data)
    setStep('review')
  })

  const buildBody = (q: Quote): CreateOrderRequest => ({
    quoteId: q.id,
    quoteHash: q.hash,
    walletId: wallet!.id,
    network,
    collector: toCollectorInfo(form.getValues()),
  })

  const submit = (body: CreateOrderRequest) => {
    setSubmitError(null)
    place.place(body, {
      onSuccess: (order) => void navigate({ to: '/orders/$orderId', params: { orderId: order.id } }),
      onError: (e) => {
        if (isApiError(e) && e.body?.details?.quote) {
          setChanged({ previous: reviewed ?? e.body.details.quote, next: e.body.details.quote })
          return
        }
        if (isApiError(e) && e.code === 'WALLET_NOT_CONNECTED') {
          setStep('form')
          setWalletError(e.message)
          void queryClient.invalidateQueries({ queryKey: walletsQueryOptions(user.id).queryKey })
          return
        }
        if (isApiError(e) && (e.isTimeout || e.isNetwork || e.status >= 500)) {
          setSubmitError({
            message:
              'Não recebemos a confirmação do servidor. Tentar novamente reenvia a mesma solicitação — o pedido não será duplicado.',
            retry: true,
          })
          return
        }
        if (isApiError(e) && e.fieldErrors) {
          setStep('form')
          setSubmitError({ message: applyApiErrors(e, form.setError, Object.keys(collectorSchema.shape) as never) ?? e.message, retry: false })
          return
        }
        setSubmitError({ message: isApiError(e) ? e.message : 'Erro inesperado ao enviar o pedido.', retry: false })
      },
    })
  }

  /** Revalida preço, disponibilidade, cupom e taxa antes de confirmar. */
  const confirm = async () => {
    if (!reviewed || place.isPending || revalidating) return
    const body = buildBody(reviewed)
    const attempt = getAttempt(user.id)
    // Reenvio da mesma tentativa (ex.: após timeout): não cria nova cotação nem nova chave.
    if (attempt && JSON.stringify(attempt.body) === JSON.stringify(body)) return submit(body)
    setRevalidating(true)
    try {
      const { data: fresh } = await http.post<Quote>('/quote', { network })
      if (fresh.hash !== reviewed.hash) {
        setChanged({ previous: reviewed, next: fresh })
        return
      }
      submit(body)
    } catch (e) {
      setSubmitError({ message: isApiError(e) ? e.message : 'Não foi possível revalidar os valores.', retry: false })
    } finally {
      setRevalidating(false)
    }
  }

  const resumable = getAttempt(user.id)
  const pendingOrder = pending.data?.[0]

  if (cart.isPending || wallets.isPending) return <CheckoutSkeleton />
  if (cart.data && cart.data.lines.length === 0 && !resumable) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Seu carrinho está vazio</h1>
        {pendingOrder ? (
          <p className="mt-3 text-sm">
            Você tem um pedido em processamento.{' '}
            <Link to="/orders/$orderId" params={{ orderId: pendingOrder.id }} className="text-text-accent underline">
              Acompanhar pedido
            </Link>
          </p>
        ) : (
          <Link to="/" hash="catalogo" className="mt-4 inline-block text-text-accent underline">
            Explorar NFTs
          </Link>
        )}
      </div>
    )
  }

  const busy = place.isPending || revalidating
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 pt-2 pb-8 md:pt-6 xl:px-0">
      <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/cart' }, { label: 'Pagamento' }]} />
      <h1 className="text-center text-xl font-bold md:sr-only">Pagamento com carteira</h1>

      {pendingOrder && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-primary bg-surface-dark p-4 text-sm">
          <Loader2 className="size-4 animate-spin text-text-accent" aria-hidden />
          <span className="flex-1">Você tem um pedido em processamento ({pendingOrder.id}).</span>
          <Link to="/orders/$orderId" params={{ orderId: pendingOrder.id }} className="font-bold text-text-accent underline">
            Acompanhar pedido
          </Link>
        </div>
      )}
      {resumable && !place.isPending && !pendingOrder && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-primary bg-surface-dark p-4 text-sm">
          <AlertTriangle className="size-4 text-text-accent" aria-hidden />
          <span className="flex-1">Uma compra foi enviada, mas a confirmação não chegou. Retome para verificar sem duplicar o pedido.</span>
          <Button size="sm" onClick={() => submit(resumable.body)}>
            Retomar compra
          </Button>
        </div>
      )}

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_342px] lg:gap-16">
        {step === 'form' ? (
          <form id="collector-form" noValidate onSubmit={goToReview} className="space-y-5" aria-labelledby="collector-title">
            <h2 id="collector-title" className="font-bold">
              Perfil do colecionador
            </h2>
            <FormAlert>{submitError?.message}</FormAlert>
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <Field label="Nome de exibição" required error={errors.displayName?.message}>
                {(a) => <Input {...a} autoComplete="name" {...form.register('displayName')} />}
              </Field>
              <Field label="Nome de usuário" required error={errors.username?.message}>
                {(a) => <Input {...a} autoComplete="username" {...form.register('username')} />}
              </Field>
              <Field label="Rede" required error={errors.network?.message}>
                {(a) => (
                  <Controller
                    control={form.control}
                    name="network"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger {...a} className="w-full">
                          <SelectValue placeholder="Selecione uma rede" />
                        </SelectTrigger>
                        <SelectContent>
                          {NETWORK_OPTIONS.map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
              <Field label="Nome do perfil" required error={errors.profileName?.message}>
                {(a) => <Input {...a} {...form.register('profileName')} />}
              </Field>
              <Field label="Endereço da carteira" required hint="Definido pela carteira selecionada.">
                {(a) => <Input {...a} readOnly value={wallet?.address ?? ''} placeholder="Endereço 0x da carteira" />}
              </Field>
              <Field label="ENS ou carteira secundária (opcional)" error={errors.secondaryAddress?.message}>
                {(a) => <Input {...a} placeholder="0x… ou nome.eth" {...form.register('secondaryAddress')} />}
              </Field>
              <Field label="Tipo de carteira" required hint="Definido pela carteira selecionada.">
                {(a) => <Input {...a} readOnly value={wallet ? PROVIDER_LABEL[wallet.provider] : ''} placeholder="Selecione uma carteira" />}
              </Field>
              <Field label="Código de indicação" required error={errors.referralCode?.message}>
                {(a) => <Input {...a} {...form.register('referralCode')} />}
              </Field>
              <Field label="E-mail" required error={errors.email?.message}>
                {(a) => <Input {...a} type="email" autoComplete="email" {...form.register('email')} />}
              </Field>
              <Field label="Nome ENS" required error={errors.ensName?.message}>
                {(a) => (
                  <div className="flex">
                    <Input {...a} className="rounded-r-none" {...form.register('ensName')} />
                    <span className="grid place-items-center rounded-r-md border border-l-0 border-input bg-surface-dark px-3 text-sm">.eth</span>
                  </div>
                )}
              </Field>
            </div>
            <Field label="Observação do colecionador (opcional)" error={errors.note?.message} className="sm:max-w-[296px]">
              {(a) => <Textarea {...a} rows={5} className="min-h-32" {...form.register('note')} />}
            </Field>
          </form>
        ) : (
          <section aria-labelledby="review-title" className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 id="review-title" ref={reviewHeading} tabIndex={-1} className="font-bold outline-none">
                Revise seu pedido
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setStep('form')} disabled={busy}>
                <Pencil aria-hidden /> Editar dados
              </Button>
            </div>
            <dl className="grid gap-3 rounded-lg bg-card p-5 text-sm sm:grid-cols-2">
              {[
                ['Nome de exibição', form.getValues('displayName')],
                ['Nome de usuário', form.getValues('username')],
                ['Nome do perfil', form.getValues('profileName')],
                ['E-mail', form.getValues('email')],
                ['Nome ENS', `${form.getValues('ensName')}.eth`],
                ['Código de indicação', form.getValues('referralCode')],
                ['Carteira', wallet ? `${wallet.label} · ${PROVIDER_LABEL[wallet.provider]} · ${shortAddress(wallet.address)}` : '—'],
                ['Rede', NETWORK_OPTIONS.find((n) => n.id === network)?.label ?? network],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-text-secondary">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {reviewed && <OrderItems lines={reviewed.lines} />}
            {stale && (
              <p role="alert" className="flex items-center gap-2 rounded-md border border-primary bg-surface-dark p-3 text-sm">
                <AlertTriangle className="size-4 shrink-0 text-text-accent" aria-hidden />
                Os valores mudaram desde a revisão. Ao confirmar, você verá a nova cotação.
              </p>
            )}
            {submitError && (
              <div role="alert" className="space-y-3 rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
                <p>{submitError.message}</p>
                {submitError.retry && (
                  <Button size="sm" variant="outline" onClick={() => void confirm()} disabled={busy}>
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        <aside aria-labelledby="checkout-summary-title" className="min-w-0 space-y-5">
          <h2 id="checkout-summary-title" className="font-bold">
            Seus NFTs
          </h2>
          {step === 'form' && cart.data && quote.data && <OrderItems lines={quote.data.lines} />}
          {step === 'form' && cart.data && <CouponForm cart={cart.data} quote={quote.data} compact />}
          <QuoteSummary
            quote={step === 'review' && reviewed ? reviewed : quote.data}
            isPending={quote.isPending}
            isFetching={step === 'form' && quote.isFetching}
            error={quote.error}
            onRetry={() => void quote.refetch()}
          />
          {step === 'form' && (
            <WalletPicker
              userId={user.id}
              wallets={walletList}
              value={walletId}
              onChange={(id) => {
                setWalletId(id)
                setWalletError(undefined)
                const w = walletList.find((x) => x.id === id)
                if (w) form.setValue('network', w.network)
              }}
              error={walletError}
            />
          )}
          {quote.data?.blocked && step === 'form' && (
            <p role="alert" className="text-xs text-destructive">
              Há itens indisponíveis. <Link to="/cart" className="underline">Ajuste o carrinho</Link> para continuar.
            </p>
          )}
          {step === 'form' ? (
            <Button type="submit" form="collector-form" size="lg" className="w-full" disabled={!quote.data || quote.data.blocked}>
              Revisar pedido
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={() => void confirm()} disabled={busy} aria-describedby="confirm-hint">
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden /> {revalidating ? 'Verificando valores…' : 'Enviando pedido…'}
                </>
              ) : (
                `Confirmar compra · ${reviewed ? formatEth(reviewed.total) : ''}`
              )}
            </Button>
          )}
          <p id="confirm-hint" className="text-center text-xs text-text-secondary">
            {step === 'form' ? 'Você revisa tudo antes de confirmar.' : 'Preço, disponibilidade, cupom e taxa são revalidados ao confirmar.'}
          </p>
        </aside>
      </div>

      <QuoteChangedDialog
        previous={changed?.previous ?? null}
        next={changed?.next ?? null}
        onCancel={() => {
          if (changed?.next.blocked) void navigate({ to: '/cart' })
          setChanged(null)
        }}
        onAccept={() => {
          if (changed) setReviewed(changed.next)
          setChanged(null)
          void queryClient.invalidateQueries({ queryKey: ['quote'] })
        }}
      />
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 pt-6 lg:grid-cols-[1fr_342px] xl:px-0" aria-busy="true">
      <p className="sr-only" role="status">
        Carregando pagamento…
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="skeleton h-[68px]" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-10" />
        ))}
      </div>
    </div>
  )
}
