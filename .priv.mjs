import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(process.argv[3] ?? 1440), height: 900 } })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://localhost:5173/login?scenario=success')
await page.getByPlaceholder('contato@email.com').fill('ana@example.com')
await page.getByPlaceholder('Senha').fill('Senha@123')
await page.getByRole('button', { name: 'Entrar', exact: true }).click()
await page.waitForURL('http://localhost:5173/')
for (const p of process.argv[2].split(',')) {
  await page.goto('http://localhost:5173/' + p)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-joaovictordasilvadias-Desktop-Desenvolvimento-Desafios-tecnicos-Jungle-Gaming-Resources-nft-marketplace/a5cebf7e-d6ba-49c7-8e45-7321cc4ce389/scratchpad/' + p + '-' + (process.argv[3] ?? 1440) + '.png', fullPage: false })
}
await browser.close()
