/**
 * End-to-end tests against the app as a visitor meets it.
 *
 * Locally and in CI the app runs on MiniOxygen against two stand-ins: Shopify's own hosted
 * mock.shop for the Storefront API, and the mock PJK in `mocks/pjk` for artist sign-in. Neither
 * needs an account, so the suite runs on a fork's pull request and on a laptop with no
 * credentials at all.
 *
 * Chromium only. Most buyers will be on an Android phone, so the mobile project is the one that
 * matters most and desktop is the second check, not the first.
 */
import {defineConfig, devices} from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'tests/e2e',
  // A failing assertion is a failing assertion; retrying only in CI hides flakiness locally.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [['github'], ['html', {open: 'never'}]]
    : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {name: 'mobile', use: {...devices['Pixel 7']}},
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
  ],
  webServer: {
    // --env-file rather than this block's `env`: Hydrogen runs the app inside workerd, and the
    // worker's environment comes from a file rather than from the process that started the dev
    // server, so variables set here never reach it. .env.e2e is committed and holds only
    // throwaway values.
    command: `pnpm exec shopify hydrogen dev --port ${port} --env-file .env.e2e`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
