# Arquitetura

> Documento vivo. Seções marcadas **(a definir)** dependem da implementação das features.

## Princípios

1. **URL como fonte de verdade** para busca, filtros, ordenação e paginação (`validateSearch` com zod no TanStack Router).
2. **Servidor (simulado) como fonte de verdade** dos dados; TanStack Query é o cache. Sem estado remoto em stores locais.
3. **Mocks apenas na camada de rede** (MSW). Componentes, hooks e cliente Axios não contêm respostas fictícias nem caminhos alternativos.
4. **Contratos únicos** em `src/lib/api/contracts.ts`, compartilhados por UI, Query e handlers MSW.
5. **ETH como string decimal**, calculado com `decimal.js` (`src/lib/money/eth.ts`); quantidades são inteiras.

## Camadas

| Camada | Local | Responsabilidade |
| --- | --- | --- |
| Rotas | `src/routes` | URL, guards (`_private`), validação de search params |
| Features | `src/features/*` | `api/` (queryOptions + funções Axios), `hooks/`, `components/`, `model/` |
| Infra HTTP | `src/lib/api` | Axios, `ApiError`, query keys, contratos |
| Tempo real | `src/lib/realtime` | Cliente `socket.io-client` ligado ao ciclo de vida da sessão |
| Mocks | `src/mocks` | Handlers REST, servidor Socket.IO, db em memória/persistido, fixtures, cenários |

## Contratos REST

Tipos em `src/lib/api/contracts.ts`. Recursos: sessão/conta, NFTs, favoritos, carrinho, cotação, pedidos (idempotentes), perfil, carteiras.
Erros usam `ApiErrorBody { code, message, fieldErrors?, retryable? }` cobrindo validação, sessão inválida/expirada, permissão, inexistente, conflito de disponibilidade, preço alterado, cupom, e-mail duplicado, conflito de idempotência, pagamento recusado e falha transitória.
**(a definir)** tabela de endpoints (método, caminho, status) quando os handlers forem implementados.

## Eventos Socket.IO

Envelope: `{ eventId, type, resource: { kind, id }, version, sessionId, payload }`.

| Evento | Efeito |
| --- | --- |
| `nft.updated` | Atualiza preço/disponibilidade no catálogo, detalhe e carrinho (cache + invalidação) |
| `order.updated` | Atualiza estado do pedido; confirmado/recusado são terminais |

Regras do cliente: deduplicar por `eventId`; descartar `version` ≤ conhecida; ignorar `sessionId` diferente da atual; liberar listeners ao desmontar/logout; **após reconexão, refazer fetch REST** dos recursos ativos.

## Sessão **(a definir)**

- Sessão consultada em `GET /session` (cache `['session']`); guard `_private` redireciona ao login com `redirect`.
- 401 dispara o handler de expiração (`setSessionExpiredHandler`), preservando contexto (rota/checkout) para retomada.
- Logout/troca de usuário: `queryClient.clear()` + `disconnectSocket()`; keys privadas incluem `userId`.

## Carrinho **(a definir)**

Carrinho do visitante preservado e mesclado ao autenticar; persistência no estado simulado. Totais vêm da cotação da API (`Quote`), nunca calculados na UI. Eventos `nft.updated` invalidam a cotação e informam a mudança de forma acessível.

## Estratégia de cache e retries

Definida em `src/app/queryClient.ts`: `staleTime` 30 s, `gcTime` 5 min, retry até 2× apenas para falhas transitórias (rede/5xx) com backoff, sem retry em mutations, refetch em foco e reconexão. Respostas obsoletas são descartadas via `signal` (cancelamento) e keys que incluem os parâmetros. **(a definir)** atualização otimista (favoritos) com rollback.

## Pedidos e idempotência **(a definir)**

`POST /orders` com `Idempotency-Key`: mesma chave + mesmo conteúdo recupera o mesmo pedido; conteúdo diferente → `IDEMPOTENCY_CONFLICT`. Pedido pendente é recuperado após refresh/reconexão; recibo é snapshot imutável.

## Mocks

MSW no navegador (service worker em `public/mockServiceWorker.js`) ativado por `VITE_ENABLE_MOCKS`. Socket.IO simulado com `ws.link` + `@mswjs/socket.io-binding`; o app usa o `socket.io-client` real.

**Limitações do transporte simulado:** somente WebSocket (sem long-polling); sem rooms/namespaces/broadcast nativos (broadcast manual por registro de conexões); o "servidor" vive no navegador; o endpoint de socket é fictício.

## Acessibilidade e performance

Skip link, região `aria-live` global, foco visível, skeletons com shimmer que respeitam `prefers-reduced-motion`. Auditoria Lighthouse em `lighthouse/` (3 execuções por página/perfil, mediana). **(a definir)** resultados e justificativas.

## Desvios do Figma e decisões de UX

**(a definir)** — tokens em `src/index.css` são placeholders até a extração do Figma; fontes/assets devem ser versionados em `public/`.
