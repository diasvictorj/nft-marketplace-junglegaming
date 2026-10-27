import { chromium } from '@playwright/test'
const [,, path, name, width = '1440', full = '1'] = process.argv
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 300)) })
await page.goto('http://localhost:5173' + path)
await page.waitForTimeout(2500)
await page.screenshot({ path: '/private/tmp/claude-501/-Users-joaovictordasilvadias-Desktop-Desenvolvimento-Desafios-tecnicos-Jungle-Gaming-Resources-nft-marketplace/a5cebf7e-d6ba-49c7-8e45-7321cc4ce389/scratchpad/' + name + '.png', fullPage: full === '1' })
await browser.close()
