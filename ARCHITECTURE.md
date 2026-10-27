# Arquitetura

## Princípios

1. **URL como fonte de verdade** para busca, filtros, ordenação, aba e paginação (`validateSearch` com zod em `src/features/catalog/model/search.ts`). Mudar busca/filtro/ordenação reinicia a página; valores inválidos caem para o padrão.
2. **Servidor (simulado) como fonte de verdade**; o TanStack Query é o cache. Não há store global de dados remotos. Totais de carrinho e pedido vêm sempre da cotação da API.
3. **Mocks só na camada de rede** (MSW). Componentes, hooks e o cliente Axios não contêm respostas fictícias nem caminhos alternativos: com `VITE_ENABLE_MOCKS=false` o mesmo código fala com uma API real em `VITE_API_URL`.
4. **Contratos únicos** em `src/lib/api/contracts.ts`, usados pela UI, pelo Query, pelo Axios e pelos handlers MSW.
5. **ETH como string decimal** em todo o tráfego (18 casas), calculado com `decimal.js` no servidor simulado. A UI só formata (até 6 casas, sem zeros à direita). Quantidades são inteiras e validadas nos dois lados.

## Camadas

| Camada | Local | Responsabilidade |
| --- | --- | --- |
| Rotas | `src/routes` | URL, guards (`_private`), loaders (pré-busca), `notFound`, estados de pendência |
| Features | `src/features/*` | `api/` (funções Axios tipadas + `queryOptions`/mutations), `components/`, `hooks/`, `model/` (schemas zod, regras de UI) |
| HTTP | `src/lib/api` | Axios (`Authorization`, `X-Cart-Id`, normalização em `ApiError`), query keys |
| Sessão | `src/lib/session`, `features/auth` | token, carrinho do visitante, armazenamento privado por usuário, expiração |
| Tempo real | `src/lib/realtime` | cliente Socket.IO + `RealtimeBridge` (eventos → cache) |
| Mocks | `src/mocks` | seed e store persistido, regras de domínio, handlers REST, servidor Socket.IO, cenários, painel |

## Contratos REST

Base `VITE_API_URL` (`/api`). Autenticação por `Authorization: Bearer <token>`. O carrinho do visitante é identificado por `X-Cart-Id` (UUID em `localStorage`), enviado em todas as requisições. Corpo de erro padrão (`ApiErrorBody`): `{ code, message, fieldErrors?, retryable?, details? }`.

| Método e caminho | Auth | Sucesso | Erros |
| --- | --- | --- | --- |
| `POST /auth/signup` `{username,email,password,name?}` | — | 201 `SessionResponse` (mescla o carrinho do visitante) | 422 `VALIDATION_ERROR`, 409 `EMAIL_CONFLICT` |
| `POST /auth/login` `{email,password}` | — | 200 `SessionResponse` (mescla o carrinho do visitante) | 422, 401 `INVALID_CREDENTIALS` |
| `GET /session` | Bearer | 200 `SessionResponse` | 401 `INVALID_SESSION` / `SESSION_EXPIRED` |
| `POST /auth/logout` | Bearer | 204 | 401 |
| `GET /nfts?q&category*&network*&minPrice&maxPrice&sort&tab&favorites&page&pageSize` | opcional (`favorites=true` exige) | 200 `Page<Nft>` | 400 `VALIDATION_ERROR`, 401 |
| `GET /nfts/facets` | — | 200 `NftFacets` (contagens por coleção/rede, faixa de preço) | — |
| `GET /nfts/featured` | — | 200 `{hero, spotlight}` | — |
| `GET /nfts/:id` | — | 200 `Nft` | 404 `NOT_FOUND` |
| `GET /favorites` · `POST /favorites {nftId}` · `DELETE /favorites/:nftId` | Bearer | 200 `{nftIds}` | 401, 404 |
| `GET /cart` | Bearer ou `X-Cart-Id` | 200 `Cart` | 400 |
| `POST /cart/items {nftId,editionId,quantity}` | idem | 200 `Cart` | 422, 404, 409 `AVAILABILITY_CONFLICT` |
| `PATCH /cart/items/:nftId/:editionId {quantity}` · `DELETE …` | idem | 200 `Cart` | 422, 404, 409 |
| `PUT /cart/coupon {code}` · `DELETE /cart/coupon` | idem | 200 `Cart` | 422 `COUPON_INVALID` / `COUPON_EXPIRED` |
| `POST /cart/acknowledge` | idem | 200 `Cart` (confirma que o usuário viu os novos preços) | — |
| `POST /quote {network}` | idem | 200 `Quote` (linhas, problemas por linha, subtotal, desconto, taxa, total, `hash`, `blocked`, `expiresAt`) | 422 |
| `POST /orders` + `Idempotency-Key` | Bearer | 201 `Order` (pendente); 200 com o mesmo pedido em reenvio | 400, 422, 404, 409 `IDEMPOTENCY_CONFLICT` / `QUOTE_CHANGED` / `QUOTE_EXPIRED` / `AVAILABILITY_CONFLICT` / `WALLET_NOT_CONNECTED` (com `details.quote` quando aplicável) |
| `GET /orders?status=pending` · `GET /orders/:id` | Bearer | 200 `Order[]` / `Order` | 403 `FORBIDDEN` (pedido de outro usuário), 404 |
| `GET /profile` · `PATCH /profile` · `PUT /profile/avatar {dataUrl\|null}` · `POST /profile/password` | Bearer | 200 `User` / 204 | 422 por campo, 409 `EMAIL_CONFLICT`, 403 (cenário) |
| `GET /wallets` · `POST /wallets` · `PATCH /wallets/:id` | Bearer | 200/201 `Wallet` | 422 por campo, 409, 403, 404 |
| `POST /wallets/:id/connect` · `POST /wallets/:id/disconnect` | Bearer | 200 `Wallet` (`connected` por sessão) | 409 `WALLET_REJECTED` |

Falhas transitórias (`TRANSIENT_FAILURE`, 5xx, rede) são marcadas como `retryable`.

## Eventos Socket.IO

Envelope (`RealtimeEnvelope`): `{ eventId, type, resource: { kind, id }, version, sessionId, emittedAt, payload }`.

| Evento | Destino | Payload | Efeito no cliente |
| --- | --- | --- | --- |
| `nft.updated` | todas as conexões (`sessionId: null`) | `{ nft }` | atualiza o detalhe e as listas (só se a versão for maior); se o NFT está no carrinho, mostra um aviso e invalida carrinho e cotação |
| `order.updated` | só as conexões do dono (`sessionId` da conexão) | `{ order }` | atualiza o pedido em cache; em `confirmed`, invalida carrinho e cotação |

`eventId` é estável (`nft:<id>:v<versão>`, `order:<id>:v<versão>`). Regras do cliente (`src/lib/realtime/RealtimeBridge.tsx`):

- **Deduplicação** por `eventId` (conjunto limitado a 500 entradas).
- **Ordenação:** descarta `version` menor ou igual à maior já conhecida (memória do bridge ou versão em cache). Estados terminais de pedido nunca regridem.
- **Isolamento:** eventos privados com `sessionId` diferente da sessão atual são ignorados (coberto por teste que força o vazamento).
- **Respostas REST antigas** não sobrescrevem versões mais novas recebidas por evento: as `queryFn` de detalhe e de lista mantêm a versão maior.
- **Reconexão:** em todo `connect` após o primeiro, o bridge reconcilia as consultas ativas via REST (`nfts`, `cart`, `quote` e pedidos do usuário). Enquanto um pedido está pendente, há também polling de segurança a cada 4 s, que para nos estados terminais.
- **Ciclo de vida:** a conexão pertence à sessão. Login, logout ou troca de usuário desconectam o socket e removem todos os listeners; o handshake envia o token em `auth`.

### Transporte simulado e limitações

O servidor vive no navegador: `ws.link` do MSW intercepta o WebSocket e `@mswjs/socket.io-binding` codifica e decodifica o protocolo Engine.IO/Socket.IO, então o app usa o `socket.io-client` real. Limitações:

- **Só WebSocket**, sem long-polling (`transports: ['websocket']`).
- **Sem rooms, namespaces ou broadcast nativos:** o servidor simulado mantém um registro de conexões e roteia pelo `sessionId` resolvido a partir do token no pacote `CONNECT`.
- **Heartbeat manual:** o binding não envia pings, então o servidor simulado emite pings do Engine.IO a cada 20 s.
- **Barra final na URL:** o MSW 3 não intercepta URLs WebSocket com barra final; o cliente usa `addTrailingSlash: false` (`/socket.io?EIO=4…`).
- **Ordem de import:** o `engine.io-client` captura `globalThis.WebSocket` quando é avaliado. Por isso o `socket.io-client` é importado sob demanda e o app só monta depois de `worker.start()`.
- **Servidor indisponível:** a queda do servidor é simulada sem responder ao handshake; o `timeout` de 3 s do cliente agenda a próxima tentativa.
- **Escopo por aba:** o "servidor" é por aba. O estado REST é compartilhado entre abas pelo `localStorage`, mas os eventos não atravessam abas, e o log de eventos se perde no reload.

## Sessão

- O token opaco fica no `localStorage` (`kurio:token`), então a sessão sobrevive ao refresh. A sessão é lida em `GET /session` (cache `['session']`). A senha nunca é armazenada; o servidor simulado guarda hash com salt.
- `_private` é um layout pathless com guard em `beforeLoad`: sem sessão, redireciona para `/login?redirect=<rota atual>`. Se a sessão cair com a página aberta, o conteúdo privado deixa de renderizar.
- **Expiração** (`SessionWatcher`): qualquer 401 `SESSION_EXPIRED`/`INVALID_SESSION` de uma requisição autenticada derruba a sessão local, limpa o cache privado e leva ao login com `reason=expired` e o `redirect` da tela atual. Um timer também confere a sessão ao atingir `expiresAt`, sem depender de interação. O rascunho do checkout é **preservado** (sessionStorage associado ao usuário) e retomado após o novo login do mesmo usuário.
- **Logout e troca de usuário:** removem do cache tudo sob `['user', …]`, `['cart', …]` e `['quote', …]`, apagam rascunhos e tentativas de checkout, e reconectam o socket com a nova identidade. As keys privadas incluem o `userId`, então dados de outro usuário nunca são servidos do cache.

## Carrinho

- O carrinho vive no **servidor**: do usuário (`user:<id>`) ou do visitante (`guest:<X-Cart-Id>`). Sobrevive ao refresh porque o estado simulado persiste no `localStorage`.
- No login ou cadastro, o servidor **mescla** o carrinho do visitante no do usuário, respeitando a disponibilidade, e descarta o anônimo.
- Cada item guarda `seenUnitPrice`. Quando o preço atual difere, o carrinho mostra um aviso persistente (`role=status`) com "de X para Y", até o usuário clicar em *Entendi* (`/cart/acknowledge`). Esgotamento ou estoque insuficiente aparecem por linha e bloqueiam o checkout (`quote.blocked`).
- Todos os valores vêm da **cotação** (`POST /quote`), cujo cache é indexado por dono, rede e versão do carrinho. Toda mutation do carrinho e todo `nft.updated` que o afete invalidam a cotação.
- Após a confirmação, o servidor remove **apenas os itens e quantidades comprados**. Em recusa ou falha, nada é removido.

## Checkout e pedidos

1. **Formulário** com os campos do layout (zod + react-hook-form, erros por campo associados via `aria-describedby`). É preciso escolher uma carteira cadastrada e conectá-la (simulação de conexão, recusa e desconexão); a rede afeta a taxa.
2. **Revisão**: a cotação revisada fica fixada. Se a cotação ao vivo mudar (por evento), aparece um aviso de que os valores estão desatualizados.
3. **Confirmar**: antes de enviar, o cliente **revalida** com uma nova cotação. Se o `hash` difere, abre um diálogo com as diferenças e o pedido só segue após *Aceitar novos valores*. O servidor revalida de novo (`QUOTE_CHANGED`, `QUOTE_EXPIRED`, `AVAILABILITY_CONFLICT`).
4. **Idempotência**: a chave nasce uma vez por conteúdo do pedido e é persistida em sessionStorage. Reenvio após timeout, refresh ou clique repetido usa a **mesma chave**, e o servidor devolve o mesmo pedido (a mesma chave com outro conteúdo gera 409). Uma trava síncrona e o botão desabilitado impedem envios concorrentes. Erros definitivos (4xx) descartam a tentativa; timeout, rede e 5xx a mantêm para *Tentar novamente* ou *Retomar compra*.
5. **Pedido** (`/orders/:id`): o pedido pendente é atualizado por `order.updated`, com polling de segurança, e é recuperável após refresh ou reconexão. A tela de **confirmação só aparece para `confirmed`** vindo da simulação. Para `declined`, a tela oferece repetir o pagamento e mostra que os itens continuam no carrinho. O **recibo** é o snapshot `order.quote`, gravado na criação; mudanças posteriores no catálogo não o alteram (coberto por teste).

## Estratégia de cache, retries e sincronização

Definida em `src/app/queryClient.ts` e nas `queryOptions`:

| Aspecto | Política |
| --- | --- |
| `staleTime` padrão | 30 s; sessão 5 min; facets 5 min; carrinho 10 s; cotação 60 s (mas invalidada por mutation ou evento); pedido terminal `Infinity` |
| `gcTime` | 5 min |
| Retries | até 2 novas tentativas **somente** em falha transitória (rede, timeout, 5xx), com backoff exponencial (1 s, 2 s, máx. 4 s); 4xx nunca é repetido; mutations nunca repetem automaticamente |
| Refetch | ao focar a janela e ao reconectar a rede; após reconexão do socket, pelo bridge |
| Respostas obsoletas | toda `queryFn` usa o `signal` (cancelamento); keys incluem todos os parâmetros; `keepPreviousData` no catálogo com indicador "Atualizando resultados…" e `aria-busy` |
| Otimista | favoritos: `onMutate` aplica, `onError` faz rollback e avisa, `onSettled` revalida |
| Invalidação | mutations do carrinho gravam o carrinho retornado e invalidam cotações; confirmação de pedido invalida carrinho e catálogo; perfil atualiza também a sessão em cache |

## Mocks

- `src/mocks/db`: o seed é determinístico (40 NFTs, 9 coleções, 3 redes, edições 1/1, 1/10, 1/50 e Aberta, 2 usuários, carteiras, cupons) e é persistido no `localStorage` (`mock:db:v1`, com versão de schema). O reset restaura o seed.
- `src/mocks/domain`: regras compartilhadas (carrinho, cupom, cotação, pedidos, liquidação). A liquidação usa `setTimeout` e também é "preguiçosa" na leitura, para sobreviver a reload.
- `src/mocks/handlers`: `route()` aplica latência (PRNG com seed), falhas declarativas do cenário, autenticação e erros padronizados.
- Ativação por `VITE_ENABLE_MOCKS`. O build de demonstração mantém os mocks; o código de mocks fica em chunks dinâmicos e não entra no bundle quando desligado.

## Acessibilidade

- Skip link, `main` focável, região `aria-live` global e toasts (sonner) para feedback de mutations e de tempo real.
- Diálogos e drawers Radix (login/cadastro, zoom, filtros mobile, cotação alterada, painel de mocks) com foco preso, Esc e retorno do foco ao gatilho.
- Formulários com label associado, `aria-invalid`, mensagens ligadas por `aria-describedby` e o primeiro campo inválido focado.
- Estados não dependem só de cor: edição esgotada aparece riscada e com texto "(esgotada)"; carteira mostra "Conectada"/"Desconectada" com ícone; favorito usa `aria-pressed`.
- Skeletons com shimmer que respeitam `prefers-reduced-motion`, com dimensões iguais às do conteúdo (CLS 0).
- Sem overflow horizontal em 390, 768 e 1440 px (coberto por teste; 1024 e 1280 verificados manualmente).

## Desvios do Figma e decisões de UX

- **Login e cadastro** aparecem como diálogo sobre um fundo decorativo, não sobre a página de mercado ao vivo. São rotas próprias, para acesso direto e retorno ao fluxo.
- **"Usar outra carteira?"** do layout de pagamento virou a lista de carteiras cadastradas mais o link *Gerenciar carteiras*. **Endereço** e **tipo de carteira** são somente leitura e derivados da carteira escolhida, porque o pedido usa carteiras cadastradas.
- O **formulário de carteiras** mantém os campos pertinentes à carteira (apelido, rede, endereço, tipo). Os campos de perfil copiados no frame foram omitidos.
- **Perfil:** `Nome ENS` é opcional (no layout é obrigatório), porque nem todo colecionador tem ENS.
- **Confirmação do pedido:** o "modal" do Figma virou um cartão centralizado na rota `/orders/:id`, o que permite acesso direto, refresh e retomada do pendente.
- **Ações fora do escopo** (Criadores, Aprenda, blog, newsletter, login social, recuperação de senha, Atividade, Ofertas, Downloads, Suporte) mostram aviso de indisponibilidade ou aparecem desabilitadas. Nenhuma simula sucesso. As redes sociais abrem os sites oficiais em nova aba.
- **Etherscan:** o link aponta para `sepolia.etherscan.io` com uma referência simulada e é rotulado como simulado.
- **Ícones:** usamos lucide, exceto os de redes sociais, exportados do Figma (o lucide v1 não traz marcas).
- **Imagens:** existem só 4 ilustrações-fonte no arquivo. Os 40 NFTs reutilizam essas obras, convertidas para WebP em 3 tamanhos (`npm run assets`).
- **Fonte:** Roboto Mono variável, auto-hospedada via `@fontsource-variable`.
- **Mobile:** sem frames de perfil, carteiras e confirmação; essas telas empilham o layout desktop. A barra de compra do detalhe fica fixa sobre a tab bar. O painel "Mocks" é uma aba vertical na borda esquerda.
- **Contraste:** a barra laranja do rodapé dos modais e os badges seguem os tokens. O Lighthouse Accessibility mede 100.

## Limitações conhecidas

- Os eventos de tempo real não atravessam abas (servidor simulado por aba); o REST é compartilhado via `localStorage`, com a última escrita prevalecendo.
- Em `npm run dev`, o double-mount do StrictMode cancela e refaz a 1ª consulta do catálogo, o que consome uma falha extra no cenário `http-5xx`. No build (onde rodam os testes e o deploy), o cenário é exato.
- O avatar é redimensionado no cliente (256 px, WebP) e guardado como data URL no estado simulado.
