import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:            './e2e',
  fullyParallel:      true,
  forbidOnly:         !!process.env.CI,
  retries:            process.env.CI ? 2 : 0,
  workers:            process.env.CI ? 1 : undefined,
  reporter:           'html',

  use: {
    baseURL:           process.env.PLAYWRIGHT_BASE_URL ?? 'https://mc-importados.xyz',
    trace:            'on-first-retry',
    screenshot:       'only-on-failure',
    video:            'retain-on-failure',
    locale:           'es-AR',
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
    {
      name:  'Mobile Chrome',
      use:   { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command:           'npm run dev',
    url:               'https://mc-importados.xyz',
    reuseExistingServer: !process.env.CI,
    timeout:           120_000,
  },
});
