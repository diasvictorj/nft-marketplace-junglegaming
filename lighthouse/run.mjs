import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { baseUrl, pages, profiles, runs, targets } from './config.mjs'

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const outDir = 'lighthouse/reports'
await mkdir(outDir, { recursive: true })

const summary = {
  env: { node: process.version, os: `${os.type()} ${os.release()}`, cpus: os.cpus().length, baseUrl, runs },
  results: [],
}

for (const page of pages) {
  for (const [profileName, settings] of Object.entries(profiles)) {
    const scores = { performance: [], accessibility: [], 'best-practices': [], seo: [] }
    const metrics = { lcp: [], cls: [], tbt: [] }
    for (let i = 1; i <= runs; i++) {
      const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
      try {
        const r = await lighthouse(
          `${baseUrl}${page.path}`,
          { port: chrome.port, output: ['html', 'json'], logLevel: 'error' },
          { extends: 'lighthouse:default', settings: { ...settings, onlyCategories: Object.keys(scores) } },
        )
        const lhr = r.lhr
        for (const k of Object.keys(scores)) scores[k].push(Math.round((lhr.categories[k]?.score ?? 0) * 100))
        metrics.lcp.push(lhr.audits['largest-contentful-paint'].numericValue)
        metrics.cls.push(lhr.audits['cumulative-layout-shift'].numericValue)
        metrics.tbt.push(lhr.audits['total-blocking-time'].numericValue)
        const base = `${outDir}/${page.name}-${profileName}-run${i}`
        await writeFile(`${base}.html`, r.report[0])
        await writeFile(`${base}.json`, r.report[1])
      } finally {
        await chrome.kill()
      }
    }
    const med = Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, median(v)]))
    summary.results.push({
      page: page.name,
      profile: profileName,
      medianScores: med,
      medianMetrics: { lcpMs: median(metrics.lcp), cls: median(metrics.cls), tbtMs: median(metrics.tbt) },
      meetsTargets: Object.entries(targets).every(([k, t]) => med[k] >= t),
    })
  }
}

await writeFile(`${outDir}/summary.json`, JSON.stringify(summary, null, 2))
console.table(summary.results.map((r) => ({ page: r.page, profile: r.profile, ...r.medianScores, ok: r.meetsTargets })))
