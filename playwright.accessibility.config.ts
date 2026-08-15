import { defineConfig, devices } from '@playwright/test'

const ciWebglArgs = [
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
  '--disable-dev-shm-usage',
]

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
    launchOptions: { args: ciWebglArgs },
  },
  webServer: {
    command: 'python3 -m http.server 3000 --bind 127.0.0.1 --directory urai-tier1/out',
    url: 'http://127.0.0.1:3000/home/',
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
