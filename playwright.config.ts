import { defineConfig, devices } from '@playwright/test'

/**
 * E2E contra o build de demonstração (mocks ativos). Chromium em dois viewports.
 * Relatório HTML + traces apenas nas falhas (retain-on-failure).
 * `PW_BASE_URL=http://localhost:5173` reaproveita um servidor já em execução (ex.: dev:mocks).
 */
const PORT = 4173
const external = process.env.PW_BASE_URL

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/specs/**/*.spec.ts', 'visual/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 7_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  reporter: [['html', { open: 'never' }], ['list']],
  snapshotPathTemplate: '{testDir}/visual/__baselines__/{projectName}/{arg}{ext}',
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow', // necessário para o MSW
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],
  webServer: external
    ? undefined
    : {
        command: 'npm run build:demo && npm run preview',
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
