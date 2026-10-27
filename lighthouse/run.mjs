/**
 * Executa a auditoria: 3 medições por página e perfil, mediana de cada categoria,
 * relatórios HTML/JSON por execução e resumo (summary.json + summary.md).
 * Uso: npm run audit (build de demonstração + preview + esta auditoria).
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { baseUrl, pages, profiles, runs, targets } from './config.mjs'

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const outDir = 'lighthouse/reports'
await mkdir(outDir, { recursive: true })
const lhVersion = JSON.parse(await readFile('node_modules/lighthouse/package.json', 'utf8')).version

const summary = {
  date: new Date().toISOString(),
  env: { node: process.version, os: `${os.type()} ${os.release()} (${os.arch()})`, cpu: os.cpus()[0]?.model, cpus: os.cpus().length, lighthouse: lhVersion, baseUrl, runs },
  results: [],
}

/** Uma execução em um Chrome limpo; repete uma vez se o protocolo cair (instabilidade do headless). */
async function audit(url, settings, categories, attempt = 1) {
  const chrome = await launch({ chromeFlags: ['--headless=new'] })
  try {
    return await lighthouse(
      url,
      { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
      { extends: 'lighthouse:default', settings: { ...settings, onlyCategories: categories } },
    )
  } catch (e) {
    if (attempt >= 2) throw e
    console.warn(`[lighthouse] nova tentativa após erro: ${e.message}`)
    return audit(url, settings, categories, attempt + 1)
  } finally {
    await chrome.kill()
  }
}

for (const page of pages) {
  for (const [profileName, settings] of Object.entries(profiles).filter(([n]) => !process.env.LH_PROFILES || process.env.LH_PROFILES.split(',').includes(n))) {
    const scores = { performance: [], accessibility: [], 'best-practices': [], seo: [] }
    const metrics = { lcp: [], cls: [], tbt: [], fcp: [] }
    for (let i = 1; i <= runs; i++) {
      const r = await audit(`${baseUrl}${page.path}`, settings, Object.keys(scores))
      {
        const lhr = r.lhr
        summary.env.chrome ??= lhr.environment.hostUserAgent
        for (const k of Object.keys(scores)) scores[k].push(Math.round((lhr.categories[k]?.score ?? 0) * 100))
        metrics.lcp.push(lhr.audits['largest-contentful-paint'].numericValue)
        metrics.cls.push(lhr.audits['cumulative-layout-shift'].numericValue)
        metrics.tbt.push(lhr.audits['total-blocking-time'].numericValue)
        metrics.fcp.push(lhr.audits['first-contentful-paint'].numericValue)
        const base = `${outDir}/${page.name}-${profileName}-run${i}`
        await writeFile(`${base}.html`, r.report[0])
        await writeFile(`${base}.json`, r.report[1])
      }
    }
    const med = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, median(v)]))
    summary.results.push({
      page: page.name,
      profile: profileName,
      scores,
      medianScores: med,
      medianMetrics: {
        lcpMs: Math.round(median(metrics.lcp)),
        fcpMs: Math.round(median(metrics.fcp)),
        cls: Number(median(metrics.cls).toFixed(3)),
        tbtMs: Math.round(median(metrics.tbt)),
      },
      meetsTargets: Object.entries(targets).every(([k, t]) => med[k] >= t),
    })
  }
}

await writeFile(`${outDir}/summary.json`, JSON.stringify(summary, null, 2))
const rows = summary.results.map(
  (r) =>
    `| ${r.page} | ${r.profile} | ${r.medianScores.performance} | ${r.medianScores.accessibility} | ${r.medianScores['best-practices']} | ${r.medianScores.seo} | ${r.medianMetrics.lcpMs} ms | ${r.medianMetrics.cls} | ${r.medianMetrics.tbtMs} ms | ${r.meetsTargets ? '✅' : '❌'} |`,
)
await writeFile(
  `${outDir}/summary.md`,
  [
    `# Lighthouse — mediana de ${runs} execuções`,
    '',
    `Data: ${summary.date} · Lighthouse ${lhVersion} · Node ${process.version} · ${summary.env.os} · ${summary.env.cpu} (${summary.env.cpus} núcleos)`,
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | Metas |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |',
    ...rows,
    '',
  ].join('\n'),
)
console.table(summary.results.map((r) => ({ page: r.page, profile: r.profile, ...r.medianScores, ...r.medianMetrics, ok: r.meetsTargets })))
