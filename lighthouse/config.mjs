/** Configuração versionada da auditoria Lighthouse (ver README). */
export const pages = [
  { name: 'home', path: '/' },
  { name: 'nft-detail', path: '/nfts/nft-001' },
]

export const profiles = {
  mobile: { formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false } },
  desktop: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false } },
}

export const runs = 3
export const baseUrl = process.env.LH_BASE_URL ?? 'http://localhost:4173'
export const targets = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
