import { chromium } from '@playwright/test'
const browser = await chromium.launch()
for (const w of [1440, 390, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } })
  page.on('console', (m) => { if (m.text().includes('socket') || m.type() === 'error') console.log('  [console]', m.type(), m.text().slice(0, 200)) })
  await page.goto('http://localhost:5173/nfts/nft-001?scenario=success')
  const out = []
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(500); out.push(await page.evaluate(() => window.__mock?.socketConnections())) }
  console.log(w, out.join(','))
  await page.close()
}
await browser.close()
