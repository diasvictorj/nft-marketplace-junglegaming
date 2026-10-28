# Kurio — Marketplace de NFTs

Desafio Frontend em **React + TypeScript**: descoberta, compra e conta do colecionador, com APIs, autenticação, carteiras, pagamentos e tempo real **simulados via MSW** (REST + Socket.IO), seguindo o layout do Figma "GreenMint / Kurio".

- **Deploy:** https://nft-marketplace-junglegaming-theta.vercel.app (build de demonstração, mocks e tempo real ativos)
- Repositório: https://github.com/diasvictorj/nft-marketplace-junglegaming
- Arquitetura, contratos e decisões: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Auditoria Lighthouse: [`lighthouse/README.md`](./lighthouse/README.md)

## Stack

React 19 · TypeScript · TanStack Router · TanStack Query · Axios · Socket.IO (`socket.io-client`) · Tailwind CSS v4 · shadcn/ui (Radix) · MSW 3 + `@mswjs/socket.io-binding` · Playwright · Lighthouse · Vite · zod · react-hook-form · decimal.js

## Setup

Requisitos: **Node ≥ 22**. O projeto não depende de nenhum serviço externo.

```bash
npm install            # o .npmrc usa legacy-peer-deps (o binding de socket declara peer msw@2)
npx playwright install chromium   # só para rodar os testes
npm run dev:mocks      # http://localhost:5173 com REST + Socket.IO simulados
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev:mocks` | Desenvolvimento com mocks ativos (porta 5173) |
| `npm run dev` | Desenvolvimento usando o `.env` (mocks conforme `VITE_ENABLE_MOCKS`) |
| `npm run build` | Build de produção (sem mocks, a menos que o `.env` os ative) |
| `npm run build:demo` | Build de demonstração (`.env.demo`: mocks ligados) — é o que vai para o deploy |
| `npm run preview` | Serve o build em `localhost:4173` (Vite) |
| `npm run serve:dist` | Serve `dist/` com gzip e fallback de SPA (mais próximo da Vercel) |
| `npm run typecheck` | Verificação de tipos (`tsc -b`) |
| `npm run lint` | Lint (oxlint) |
| `npm run test:e2e` | Playwright: E2E + regressão visual, Chromium desktop (1440) e mobile (390), sobre o build de demonstração |
| `npm run test:e2e:report` | Abre o relatório HTML (traces das falhas incluídos) |
| `npm run test:visual:update` | Regenera as baselines de regressão visual |
| `npm run audit` | Build demo + servidor com compressão + Lighthouse (3 execuções por página/perfil, mediana) |
| `npm run assets` | Regenera as imagens WebP a partir dos originais exportados do Figma |

Para rodar os testes contra um servidor já em execução (ex.: `dev:mocks`): `PW_BASE_URL=http://localhost:5173 npx playwright test`.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `false` (`true` em `.env.demo` e em `dev:mocks`) | Ativa o MSW (REST + Socket.IO) no navegador |
| `VITE_MOCK_SCENARIO` | `success` | Cenário inicial dos mocks |
| `VITE_API_URL` | `/api` | Base das chamadas REST (Axios) |
| `VITE_SOCKET_URL` | mesma origem da página (`ws(s)://host`) | Endpoint Socket.IO; com mocks é interceptado pelo MSW |

Veja `.env.example`. O build de demonstração (`--mode demo`) lê `.env.demo`.

## Credenciais fictícias

| Usuário | E-mail | Senha | Observações |
| --- | --- | --- | --- |
| Ana Colecionadora | `ana@example.com` | `Senha@123` | 2 carteiras (MetaMask principal, Coinbase secundária), 2 favoritos |
| Bruno Colecionador | `bruno@example.com` | `Senha@456` | 1 carteira (WalletConnect principal), 1 favorito |

Senhas nunca ficam em claro: o estado simulado guarda apenas `SHA-256(salt:senha)`. Cupons: `KURIO10` (10%), `GENESIS` (0,1 ETH), `VERAO24` (expirado); qualquer outro é inválido.

## Cenários dos mocks

Selecione o cenário por **`?scenario=<id>`** na URL (persistido; trocar de cenário **reseta o estado**), pelo **painel "Mocks"** (aba na borda esquerda da tela) ou por `VITE_MOCK_SCENARIO`.

| Cenário | Comportamento |
| --- | --- |
| `success` | Fluxo feliz (latência 120 ms) |
| `empty` | Catálogo sem resultados |
| `slow` | Todas as respostas com 2,5 s (skeletons) |
| `variable-latency` | Latência 100–1600 ms com PRNG de seed fixa (reproduzível) |
| `out-of-order` | Requisições consecutivas do catálogo chegam invertidas |
| `network-down` | Toda a API falha por rede |
| `http-4xx` | Mutations de favoritos respondem 400 |
| `http-5xx` | Catálogo responde 503 três vezes (esgota retries); favoritos sempre 503 |
| `session-expired` | Sessão expira 20 s após o login |
| `unauthorized` | Perfil e carteiras respondem 403 |
| `signup-conflict` | Todo cadastro responde 409 (e-mail em uso) |
| `coupon-invalid` / `coupon-expired` | Qualquer cupom é inválido / expirado |
| `price-changed` | Preço do 1º item do carrinho sobe 10% 4 s após a 1ª cotação (via `nft.updated`) |
| `sold-out` | Edição do 1º item do carrinho esgota 4 s após a 1ª cotação |
| `order-timeout` | O pedido é criado, mas a 1ª resposta demora 9 s (o cliente expira em 6 s) |
| `wallet-rejected` | A carteira recusa a conexão |
| `payment-confirmed` / `payment-declined` | Liquidação confirmada / recusada |

**Reset:** painel "Mocks" → *Resetar estado*, ou abra qualquer URL com `?scenario=<id>` diferente do atual, ou no console `await __mock.reset()`. O reset restaura integralmente o seed (catálogo, usuários, carrinhos, pedidos, carteiras) e limpa a persistência local do servidor simulado.

**Controles no console** (`window.__mock`, também usados pelos testes): `setScenario(id)`, `reset()`, `expireSessions()`, `updateEdition(nftId, editionId, { price?, available? })`, `replayLast('nft.updated')`, `emitStaleNft(nftId, price)`, `leakLastOrderEvent()`, `dropSocket(ms)`, `settlePendingOrders()`, `snapshot()`. Todo evento é emitido pelo **servidor Socket.IO simulado** e chega ao app pelo `socket.io-client`.

## Reproduzindo os fluxos de falha

| Fluxo | Como reproduzir |
| --- | --- |
| Catálogo vazio / lento / fora de ordem | `/?scenario=empty`, `/?scenario=slow`, `/?scenario=out-of-order` e digite na busca |
| Falha e nova tentativa | `/?scenario=http-5xx` → erro do catálogo → **Tentar novamente** |
| Sem rede | `/?scenario=network-down` |
| Favorito com rollback | `/?scenario=http-5xx`, entre como Ana e favorite um NFT: o coração muda e volta, com aviso |
| Conflito de cadastro | Crie conta com `ana@example.com`, ou use `/?scenario=signup-conflict` |
| Sessão expirada | Entre e use *Expirar sessão agora* no painel (ou `/?scenario=session-expired` e aguarde 20 s); você volta ao login e retorna à mesma tela; o rascunho do checkout é preservado |
| Cupom inválido / expirado | No carrinho: `NAOEXISTE` / `VERAO24` |
| Preço muda no carrinho/checkout | Com item no carrinho: painel → *Subir preço do 1º item*; ou `/?scenario=price-changed` e vá ao checkout |
| Edição esgota durante a compra | `/?scenario=sold-out`, adicione um item e aguarde 4 s no carrinho |
| Pagamento recusado | `/?scenario=payment-declined` e conclua uma compra |
| Clique repetido | Clique várias vezes em *Confirmar compra*: um único pedido (veja `__mock.snapshot().orders`) |
| Timeout com recuperação | `/?scenario=order-timeout`: após o aviso, **Tentar novamente** recupera o mesmo pedido (ou recarregue e clique em *Retomar compra*) |
| Carteira recusa conexão | `/?scenario=wallet-rejected` e clique em *Conectar carteira* no checkout |
| Desconexão com pedido pendente | Confirme uma compra e, na tela "Processando", use *Derrubar socket por 6 s*: o estado é reconciliado via REST ao reconectar; recarregar também recupera |
| Acesso não autorizado | `/?scenario=unauthorized` e abra Perfil |

## Testes

`npm run test:e2e` executa os 12 grupos exigidos (`tests/e2e/specs/01…12`) e a regressão visual (`tests/visual`) nos projetos `desktop` (1440×900) e `mobile` (390×844), contra o **build de demonstração**. Cada teste roda em um contexto novo e abre o app com `?scenario=…`, o que reseta o estado. REST passa pelos handlers MSW; tempo real passa pelo servidor Socket.IO simulado e pelo `socket.io-client`. Relógio controlado com `page.clock` no cenário de expiração. Relatório HTML em `playwright-report/`; traces e screenshots só nas falhas (`test-results/`). Baselines visuais versionadas em `tests/visual/__baselines__/`.

## Deploy

`vercel.json` usa `npm run build:demo` (mocks ligados) e reescreve para `index.html` toda rota sem extensão (acesso direto e refresh funcionam; `mockServiceWorker.js`, assets e `robots.txt` são servidos como arquivos). Netlify/Cloudflare Pages: build `npm run build:demo`, publish `dist`, fallback de SPA para `index.html`.

A versão publicada em https://nft-marketplace-junglegaming-theta.vercel.app é gerada automaticamente a cada push na `main`. A mesma suíte E2E roda contra ela:

```bash
PW_BASE_URL=https://nft-marketplace-junglegaming-theta.vercel.app npx playwright test
```

## Estrutura

```
src/
  app/            bootstrap, queryClient (política de cache/retries), router
  routes/         rotas file-based (TanStack Router); _private.* exigem sessão
  features/       auth, catalog, nft, favorites, cart, checkout, orders, profile, wallets
                  (api/ = Axios + queryOptions/mutations, components/, hooks/, model/)
  lib/            api (Axios, ApiError, contratos, query keys), money (decimal.js),
                  realtime (socket + ponte com o cache), session, a11y
  components/     ui (shadcn adaptado), layout, form, common
  mocks/          db (seed + store persistido), domain (regras), handlers REST,
                  socket (servidor Socket.IO), scenarios, control (__mock), devtools
tests/            e2e (fixtures, specs 01–12) e visual (baselines)
lighthouse/       configuração, runner e relatórios versionados
design/           ilustrações originais exportadas do Figma
```
