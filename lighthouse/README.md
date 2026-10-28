# Auditoria Lighthouse

`npm run audit` faz o build de demonstração (`vite build --mode demo`, mocks ligados, sem simplificações), serve `dist/` com `serve` (gzip e fallback de SPA, como Vercel/Netlify) em `localhost:4173` e roda `lighthouse/run.mjs`.

- **Páginas:** início (`/`) e detalhe do NFT (`/nfts/nft-001`), no cenário padrão dos mocks (`success`).
- **Perfis** (`config.mjs`):
  - mobile: tela 412×823 @1,75x, rede simulada de 150 ms RTT e 1,6 Mbps, CPU 4×.
  - desktop: tela 1350×940, 40 ms RTT, 10 Mbps, CPU 1×.
  - Ambos com `throttlingMethod: simulate`.
- **Execuções:** 3 por página e perfil, cada uma em um Chrome headless novo (storage limpo; o service worker do MSW é registrado do zero). O resumo usa a **mediana** de cada categoria e métrica.
- **Saídas** em `lighthouse/reports/`:
  - `<página>-<perfil>-run<n>.html|json`: relatório completo de cada execução;
  - `summary.json`: notas de todas as execuções, medianas, LCP/FCP/CLS/TBT e ambiente;
  - `summary.md`: tabela-resumo.
- Variáveis opcionais: `LH_BASE_URL`, `LH_RUNS`, `LH_PROFILES=mobile,desktop`.

## Resultado (mediana de 3 execuções)

Ambiente: macOS 26 (Darwin 25.5.0, arm64), Apple M2 (8 núcleos), Node 22.16.0, Lighthouse 13.5.0, HeadlessChrome 156.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 93 | 100 | 100 | 100 | 2982 ms | 0 | 24 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 729 ms | 0.002 | 0 ms |
| Detalhe | mobile | 94 | 100 | 100 | 100 | 2895 ms | 0 | 31 ms |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 761 ms | 0 | 0 ms |

Todas as metas foram atingidas (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90).

## Análise

- **Elemento LCP no mobile:** no início, o texto ou a imagem do hero (agora exibida também no mobile, como no Figma), quase todo em *render delay*; no detalhe, a imagem principal do NFT, quase toda em *resource load delay*, porque ela só é descoberta quando o app renderiza a rota com os dados. Nos dois casos o atraso vem da mesma causa: o app só monta depois que o MSW registra o service worker e instala o interceptor de WebSocket. Esse é o custo intrínseco da simulação no navegador, já que uma API real não tem essa etapa. O bundle de mocks fica em chunks dinâmicos e não entra no caminho crítico com mocks desligados.
- **CLS ≈ 0:**
  - skeletons com as mesmas dimensões do conteúdo;
  - imagens com `width`/`height` e `aspect-ratio`;
  - `main` com altura mínima de uma tela, para o footer não se deslocar enquanto a rota carrega (antes da correção, o detalhe no desktop media CLS 0,26);
  - fonte com `font-display: swap`.
- **TBT baixo:** code splitting por rota (`autoCodeSplitting` do TanStack Router), `socket.io-client` carregado sob demanda e imagens WebP responsivas (`srcset` 320/640/960), com `loading="lazy"` fora da dobra e `fetchpriority="high"` só na imagem principal.
- **Compressão:** a auditoria usa servidor com gzip, como no deploy. Sobre o `vite preview`, que não comprime, a nota mobile cai para cerca de 90.
