# NFT Marketplace

Desafio Frontend em **React + TypeScript**: descoberta, compra e conta do colecionador, com APIs, autenticação, carteiras, pagamentos e tempo real **simulados via MSW**.

> Status: esqueleto estruturado (stack, rotas, contratos, mocks base, testes e auditoria configurados). As features estão marcadas com `TODO` nas rotas e em `src/features/*`.

## Stack

React · TypeScript · TanStack Router · TanStack Query · Axios · Socket.IO · Tailwind CSS v4 · shadcn/ui · MSW (+ `@mswjs/socket.io-binding`) · Playwright · Lighthouse · Vite

## Setup

Requisitos: Node ≥ 22.

```bash
npm install          # o .npmrc usa legacy-peer-deps (peers opcionais de @hookform/resolvers)
cp .env.example .env # opcional
npm run dev:mocks
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `false` (`true` em `.env.demo`) | Ativa o MSW (REST + Socket.IO) |
| `VITE_MOCK_SCENARIO` | `success` | Cenário inicial dos mocks |
| `VITE_API_URL` | `/api` | Base REST |
| `VITE_SOCKET_URL` | `ws://localhost:5173` | Endpoint Socket.IO (interceptado pelo MSW) |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev:mocks` | Desenvolvimento com mocks ativos |
| `npm run dev` | Desenvolvimento (mocks conforme `.env`) |
| `npm run build` / `npm run build:demo` | Build / build de demonstração (mocks ligados) |
| `npm run preview` | Serve o build em `localhost:4173` |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | Lint (oxlint) |
| `npm run test:e2e` | Playwright (Chromium, desktop 1440 e mobile 390) |
| `npm run test:visual:update` | Atualiza baselines de regressão visual |
| `npm run audit` | Build demo + preview + Lighthouse (3 execuções, mediana) |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Ana | `ana@example.com` | `Senha@123` |
| Bruno | `bruno@example.com` | `Senha@456` |

Senhas não são armazenadas em claro (hash no estado simulado).

## Cenários dos mocks

Selecione por `?scenario=<id>` na URL, `localStorage['mock:scenario']` ou `VITE_MOCK_SCENARIO`. Cenários disponíveis (ver `src/mocks/scenarios`):

`success`, `empty`, `slow`, `variable-latency`, `out-of-order`, `network-down`, `http-4xx`, `http-5xx`, `session-expired`, `unauthorized`, `signup-conflict`, `coupon-invalid`, `coupon-expired`, `price-changed`, `sold-out`, `order-timeout`, `payment-confirmed`, `payment-declined`.

**Reset:** a definir junto ao `mocks/db` (restaura o cenário conhecido e limpa a persistência local).

**Reproduzir falhas:** abra a aplicação com `?scenario=<id>` (ex.: `/?scenario=network-down`) e execute o fluxo correspondente.

## Estrutura

```
src/
  app/            queryClient, router
  routes/         rotas file-based (TanStack Router); _private = protegidas
  features/       catalog, nft, favorites, cart, checkout, orders, auth, profile, wallets
  lib/            api (Axios, contratos, query keys), money (decimal), realtime (Socket.IO)
  components/     ui (shadcn) e layout
  mocks/          handlers REST, socket (MSW), db, fixtures, scenarios
tests/            e2e (specs) e visual (baselines versionadas)
lighthouse/       config + runner da auditoria
```

## Deploy

`vercel.json` já inclui o rewrite de SPA (acesso direto/refresh) e usa `build:demo`. Netlify/Cloudflare Pages também servem com fallback para `index.html`.

## Documentação adicional

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) (contratos, sessão, carrinho, cache, reconciliação REST × Socket.IO, limitações e desvios do Figma).
