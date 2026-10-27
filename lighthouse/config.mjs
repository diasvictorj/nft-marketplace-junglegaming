/**
 * Configuração versionada da auditoria Lighthouse (ver lighthouse/README.md).
 * Mobile: perfil padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4×).
 * Desktop: preset desktop oficial (rede 10 Mbps/40 ms, sem desaceleração de CPU).
 */
export const pages = [
  { name: 'home', path: '/' },
  { name: 'nft-detail', path: '/nfts/nft-001' },
]

export const profiles = {
  mobile: {
    formFactor: 'mobile',
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
    throttlingMethod: 'simulate',
    throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
  },
  desktop: {
    formFactor: 'desktop',
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttlingMethod: 'simulate',
    throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
  },
}

export const runs = Number(process.env.LH_RUNS ?? 3)
export const baseUrl = process.env.LH_BASE_URL ?? 'http://localhost:4173'
export const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
