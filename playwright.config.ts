import { defineConfig, devices } from '@playwright/test';

// Browsers are NOT downloaded by this config. Install them once, manually, with
// `npx playwright install chromium` when you are ready to run the suite.
const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}/physics/`;

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
  // Serves the production build. Run `npm run build` first (preview serves dist/).
  webServer: {
    command: `npx astro preview --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
