import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

const API = "http://127.0.0.1:4000";

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function dobYearsAgo(years: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

function isoDaysFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86400_000);
  return d.toISOString();
}

async function apiJson(
  method: string,
  pathname: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

function grantAdminByEmail(email: string): void {
  const dbPath = path.join(process.cwd(), ".demo-video", "gametime.db");
  execFileSync(
    "sqlite3",
    [dbPath, `UPDATE parent_accounts SET is_admin = 1 WHERE email = '${email.replace(/'/g, "''")}';`],
    { stdio: "pipe" },
  );
}

async function dwell(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function tourPage(page: Page, url: string, label: string, scrollMs = 4500) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await dwell(page, 1200);
  const steps = 16;
  const delta = Math.ceil(720 / steps);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, delta);
    await dwell(page, Math.max(80, Math.floor(scrollMs / steps)));
  }
  await dwell(page, 800);
  // eslint-disable-next-line no-console
  console.log(`[demo tour] ${label}`);
}

test.describe.configure({ mode: "serial" });

test("Desktop full-app tour (recorded video)", async ({ page }) => {
  test.setTimeout(900_000);

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const parentEmail = `demo-parent-${suffix}@example.com`;
  const parentPassword = "Demo_parent_Strong1!";
  const childName = "Demo Child";
  const childEmail = `demo-child-${suffix}@example.com`;
  const childPassword = "Demo_child_Strong1!";

  const signup = await apiJson("POST", "/auth/signup", {
    body: { name: "Demo Parent", email: parentEmail, password: parentPassword },
  });
  expect(signup.status, JSON.stringify(signup.body)).toBe(201);
  const parentToken = String(signup.body.token ?? "");
  expect(parentToken.length).toBeGreaterThan(10);

  grantAdminByEmail(parentEmail);

  const childRes = await apiJson("POST", "/children/create", {
    token: parentToken,
    body: {
      name: childName,
      dateOfBirth: dobYearsAgo(11),
      email: childEmail,
      password: childPassword,
    },
  });
  expect(childRes.status, JSON.stringify(childRes.body)).toBe(201);
  const childId = String(childRes.body.id ?? "");
  expect(childId.length).toBeGreaterThan(10);

  const taskRes = await apiJson("POST", "/tasks/create", {
    token: parentToken,
    body: {
      childId,
      title: "Demo quest — evidence",
      description: "Walkthrough task for desktop demo recording.",
      points: 10,
      gpPoints: 0,
      dueDate: isoDaysFromNow(3),
      category: "chores",
    },
  });
  expect(taskRes.status, JSON.stringify(taskRes.body)).toBe(201);
  const taskId = String((taskRes.body as { id?: string }).id ?? "");
  expect(taskId.length).toBeGreaterThan(10);

  await page.setViewportSize({ width: 1440, height: 900 });

  await tourPage(page, "/", "Landing");
  await tourPage(page, "/signup", "Signup wizard entry", 3500);
  await page.goto("/login", { waitUntil: "networkidle" });
  await dwell(page, 1500);

  await page.getByRole("tab", { name: "Parent" }).click();
  await page.locator("#pl-email").fill(parentEmail);
  await page.locator("#pl-password").fill(parentPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 60_000 });
  await dwell(page, 2000);
  await tourPage(page, "/parent/dashboard", "Parent dashboard", 6000);

  await tourPage(page, "/parent/tasks", "Parent tasks", 5000);
  await tourPage(page, "/parent/ai", "Parent AI", 5000);
  await tourPage(page, "/parent/settings", "Parent settings", 5500);
  await tourPage(page, "/parent/onboarding", "Parent onboarding", 4000);
  await tourPage(page, "/admin", "Admin", 5000);

  await page.goto("/parent/dashboard", { waitUntil: "networkidle", timeout: 90_000 });
  await dwell(page, 1500);
  await page.getByRole("button", { name: "Child view" }).first().click();
  await expect(page).toHaveURL(/\/child\/dashboard/, { timeout: 45_000 });
  await dwell(page, 2000);
  await tourPage(page, "/child/dashboard", "Child dashboard", 6000);

  await page.getByRole("button", { name: /Evidence uplink/i }).click();
  await expect(page.getByRole("heading", { name: "Evidence uplink" })).toBeVisible({ timeout: 30_000 });
  await dwell(page, 2500);
  const noteField = page.getByRole("textbox", { name: /Note for parent/i });
  if (await noteField.isVisible().catch(() => false)) {
    await noteField.fill("Demo recording — completed my chore.");
  }
  await page.locator("#evidence-gallery").setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(tinyPngBase64, "base64"),
  });
  await expect(page.getByText(/Locked in:/)).toBeVisible({ timeout: 15_000 });
  await dwell(page, 2000);
  const submitBtn = page.getByRole("button", { name: /Submit for review|Submitted successfully/i });
  await submitBtn.click();
  await expect(page.getByRole("button", { name: "Submitted successfully" })).toBeVisible({ timeout: 60_000 });
  await dwell(page, 6000);

  await tourPage(page, "/child/ai", "Child AI", 4500);

  await page.goto("/child/dashboard", { waitUntil: "networkidle", timeout: 90_000 });
  await dwell(page, 1200);
  await page.getByRole("button", { name: "Switch to Parent" }).click();
  await expect(page.getByRole("heading", { name: "Parent access" })).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Parent PIN").fill("1234");
  await page.getByRole("button", { name: "Unlock parent mode" }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 45_000 });
  await dwell(page, 2000);

  const questCard = page
    .getByRole("heading", { name: "Demo quest — evidence" })
    .locator("xpath=ancestor::div[contains(@class,'card')][1]");
  await expect(questCard.getByText("Needs review")).toBeVisible({ timeout: 90_000 });
  await dwell(page, 1500);
  await questCard.getByRole("button", { name: "Approve" }).click();
  await expect(questCard).toBeHidden({ timeout: 30_000 });
  await dwell(page, 3000);

  await tourPage(page, "/forgot-password", "Forgot password", 2500);
  await tourPage(page, "/login", "Login (final)", 2000);

  const outDir = path.join(process.cwd(), "artifacts", "demo-videos");
  // eslint-disable-next-line no-console
  console.log(
    `[demo tour] Done. WebM is under test-results/ (Playwright). Copy to ${outDir} if you aggregate artifacts there.`,
  );
});
