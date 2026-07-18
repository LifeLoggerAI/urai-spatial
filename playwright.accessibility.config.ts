import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './urai-tier1/tests',
  testMatch: /accessibility-performance-.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'artifacts/accessibility-performance/playwright-report', open: 'never' }],
  ],
  outputDir: 'artifacts/accessibility-performance/test-results',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --dir urai-tier1 exec next dev --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 180000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
