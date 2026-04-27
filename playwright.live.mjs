/**
 * Playwright config for E2E against a deployed site (no local webServer).
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://your-app.vercel.app \
 *   npm run test:e2e:live
 *
 * Optional:
 *   PLAYWRIGHT_API_BASE — backend API prefix if not same-origin `/api` (default: `{origin}/api`)
 *   PLAYWRIGHT_LIVE_PARENT_EMAIL / PLAYWRIGHT_LIVE_PARENT_PASSWORD — skip signup; use this parent
 *
 * Video: saved under test-results/…/video.webm (see Playwright reporter output after the run).
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = (process.env.PLAYWRIGHT_BASE_URL || "").replace(/\/$/, "");

export default defineConfig({
  testDir: "./e2e",
  testMatch: /live-deployment-tour\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-live" }]],
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
