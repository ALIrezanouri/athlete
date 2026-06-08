import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright configuration for athlete-pwa performance tests.
 *
 * Uses the system-installed Google Chrome (channel: "chrome") to avoid
 * downloading a separate browser binary, which is necessary in regions
 * where the Playwright CDN is inaccessible.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // Run serially to avoid overloading the dev server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for consistent performance measurements
  reporter: "html",

  /* Dev server is slow; use generous timeouts */
  timeout: 120_000, // 2 minutes per test
  expect: {
    timeout: 30_000, // 30 seconds for assertions
  },

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 60_000, // 60 seconds for clicks/fills
    navigationTimeout: 90_000, // 90 seconds for navigation
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome", // Use system-installed Google Chrome
      },
    },
  ],
})
