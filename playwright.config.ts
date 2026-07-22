import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
const locationMapNativeTouch = process.env.URAI_LOCATION_MAP_ACCEPTANCE_FIXTURES === '1';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: externalBaseURL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: externalBaseURL ? undefined : {
    command: 'pnpm exec next dev -p 3000',
    cwd: './urai-tier1',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // The Location Map acceptance lane sends native CDP touch input. Advertise
        // touch capability only for that lane so compatibility click synthesis is real.
        hasTouch: locationMapNativeTouch,
      },
    },
  ],
});
