/**
 * Headless walkthrough video: signup → parent dashboard → settings → logout.
 * Run with backend + web-next dev servers up:
 *   cd web-next && node scripts/demo-walkthrough.mjs
 *
 * Requires: npm install -D playwright && npx playwright install chromium
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DEMO_BASE_URL || "http://127.0.0.1:3000";
const OUT_DIR =
  process.env.DEMO_VIDEO_DIR || path.join(__dirname, "..", "demo-output");

const email = `walkthrough${Date.now()}@example.com`;
const password = "WalkthroughDemo1!";
const name = "Demo Parent";

async function slowScroll(page, totalMs = 12000) {
  const steps = 24;
  const delta = Math.ceil(800 / steps);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(totalMs / steps);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}/signup`, { waitUntil: "networkidle", timeout: 60000 });

    await page.getByPlaceholder("e.g. Jane Smith").fill(name);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("e.g. jane@example.com").fill(email);
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "1", exact: true }).click();

    await page.locator('select').first().selectOption("10");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Too much screen time" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Friend or family recommendation" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByPlaceholder("At least 8 characters").fill(password);
    await page.getByPlaceholder("Re-enter password").fill(password);
    await page.getByRole("button", { name: "Create My Account" }).click();

    await page.waitForURL("**/parent/dashboard**", { timeout: 60000 });
    await page.waitForTimeout(1500);
    await slowScroll(page, 14000);

    await page.goto(`${BASE}/parent/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await slowScroll(page, 8000);

    const logout = page.getByRole("button", { name: /log\s*out/i }).first();
    if (await logout.isVisible().catch(() => false)) {
      await logout.click();
      await page.waitForURL("**/", { timeout: 15000 }).catch(() => {});
    }

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "Child" }).click();
    await page.waitForTimeout(2500);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(`Done. Check ${OUT_DIR} for the .webm video file.`);
  console.log(`Test account: ${email} / ${password}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
