import { test } from "@playwright/test";

function requireBaseUrl(): string {
  const raw = (process.env.PLAYWRIGHT_BASE_URL || "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error("Set PLAYWRIGHT_BASE_URL (e.g. https://gametime-app.org).");
  }
  return raw;
}

test.describe.configure({ mode: "serial" });

/** Desktop scroll of the public landing page — always passes; use for WebM artifacts. */
test("Live landing page — desktop scroll (video)", async ({ page }) => {
  const base = requireBaseUrl();
  test.setTimeout(120_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(800);
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    /* live sites may keep sockets open */
  }

  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(140);
  }
  await page.waitForTimeout(2000);
});
