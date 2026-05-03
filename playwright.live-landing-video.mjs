/**
 * Single-page live landing recording (WebM under test-results/).
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://gametime-app.org npx playwright test --config=playwright.live-landing-video.mjs
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = (process.env.PLAYWRIGHT_BASE_URL || "").replace(/\/$/, "");

export default defineConfig({
  testDir: "./e2e",
  testMatch: /landing-live-video\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL: baseURL || "http://127.0.0.1:1",
    trace: "off",
    screenshot: "off",
    video: "on",
    ignoreHTTPSErrors: Boolean(process.env.PLAYWRIGHT_IGNORE_TLS_ERRORS),
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
