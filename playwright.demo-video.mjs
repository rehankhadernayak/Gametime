/**
 * Playwright config for a long desktop tour with per-test video enabled.
 * Run: CI=1 npx playwright test e2e/desktop-full-tour-video.spec.ts --config=playwright.demo-video.mjs
 * Video output: test-results/.../video.webm (gitignored). For Cursor Desktop screen capture, add --headed.
 */
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const dbPath = path.join(process.cwd(), ".demo-video", "gametime.db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "off",
    screenshot: "off",
    video: "on",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `sh -c 'mkdir -p "${path.dirname(dbPath)}" && rm -f "${dbPath}" && cd backend && DATABASE_PATH="${dbPath}" FRONTEND_ORIGIN=http://127.0.0.1:3000 EMAIL_CHECK_MODE=mx NODE_ENV=development npm run start'`,
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command:
        "cd web-next && JWT_SECRET=dev-secret-change-me ./node_modules/.bin/next dev --port 3000",
      url: "http://127.0.0.1:3000/login",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
