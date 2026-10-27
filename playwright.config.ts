import { defineConfig, devices } from '@playwright/test';

// Set PLAYWRIGHT_BASE_URL to test a deployed site (CI sets it to the Vercel
// preview URL). Without it, the site is built and served locally.
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    extraHTTPHeaders: bypassSecret
      ? { 'x-vercel-protection-bypass': bypassSecret, 'x-vercel-set-bypass-cookie': 'true' }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // --ignore-lock keeps astro preview in the foreground; Astro 7 otherwise
        // backgrounds it when it detects an AI agent, and Playwright sees it exit.
        command: 'npm run build && npm run preview -- --ignore-lock',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
