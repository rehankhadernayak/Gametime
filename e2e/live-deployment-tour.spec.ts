import { expect, test, type Page } from "@playwright/test";

const tinyPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function requireBaseUrl(): string {
  const raw = (process.env.PLAYWRIGHT_BASE_URL || "").trim().replace(/\/$/, "");
  if (!raw) {
    throw new Error(
      "Set PLAYWRIGHT_BASE_URL to your deployed origin (e.g. https://app.example.com). See playwright.live.mjs.",
    );
  }
  return raw;
}

function apiBaseUrl(): string {
  const explicit = (process.env.PLAYWRIGHT_API_BASE || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const base = requireBaseUrl();
  return new URL("/api", `${base}/`).toString().replace(/\/$/, "");
}

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
): Promise<{ status: number; body: unknown }> {
  const base = apiBaseUrl();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function dwell(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function tourPage(page: Page, url: string, label: string, scrollMs = 4000) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dwell(page, 800);
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    // Live sites may keep long-polling; domcontentloaded + dwell is enough.
  }
  await dwell(page, 400);
  const steps = 14;
  const delta = Math.ceil(640 / steps);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, delta);
    await dwell(page, Math.max(80, Math.floor(scrollMs / steps)));
  }
  await dwell(page, 600);
  // eslint-disable-next-line no-console
  console.log(`[live tour] ${label}`);
}

test.describe.configure({ mode: "serial" });

test("Live deployment — main pages with video", async ({ page }) => {
  requireBaseUrl();
  test.setTimeout(600_000);

  const existingEmail = (process.env.PLAYWRIGHT_LIVE_PARENT_EMAIL || "").trim();
  const existingPassword = (process.env.PLAYWRIGHT_LIVE_PARENT_PASSWORD || "").trim();
  let parentEmail: string;
  let parentPassword: string;
  let parentToken: string;

  if (existingEmail && existingPassword) {
    parentEmail = existingEmail;
    parentPassword = existingPassword;
    const login = await apiJson("POST", "/auth/login", {
      body: { email: parentEmail, password: parentPassword },
    });
    expect(login.status, JSON.stringify(login.body)).toBe(200);
    const loginBody = login.body as Record<string, unknown>;
    parentToken = String(loginBody.token ?? "");
    expect(parentToken.length).toBeGreaterThan(10);
    const children = await apiJson("GET", "/children/list", { token: parentToken });
    expect(children.status).toBe(200);
    const list = children.body as { id?: string }[] | undefined;
    expect(Array.isArray(list) && list.length > 0, "PLAYWRIGHT_LIVE_PARENT_EMAIL account needs at least one child").toBe(
      true,
    );
  } else {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    parentEmail = `live-e2e-parent-${suffix}@example.com`;
    parentPassword = "Live_e2e_parent_Strong1!";
    const childName = "Live E2E Child";
    const childEmail = `live-e2e-child-${suffix}@example.com`;
    const childPassword = "Live_e2e_child_Strong1!";

    const signup = await apiJson("POST", "/auth/signup", {
      body: { name: "Live E2E Parent", email: parentEmail, password: parentPassword },
    });
    expect(signup.status, JSON.stringify(signup.body)).toBe(201);
    const signupBody = signup.body as Record<string, unknown>;
    parentToken = String(signupBody.token ?? "");
    expect(parentToken.length).toBeGreaterThan(10);

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
    const childBody = childRes.body as Record<string, unknown>;
    const childId = String(childBody.id ?? "");
    expect(childId.length).toBeGreaterThan(5);

    const taskRes = await apiJson("POST", "/tasks/create", {
      token: parentToken,
      body: {
        childId,
        title: "Live deployment check — evidence",
        description: "Automated tour task for deployment verification.",
        points: 5,
        gpPoints: 0,
        dueDate: isoDaysFromNow(3),
        category: "chores",
      },
    });
    expect(taskRes.status, JSON.stringify(taskRes.body)).toBe(201);
  }

  await page.setViewportSize({ width: 1440, height: 900 });

  await tourPage(page, "/", "Home");
  await tourPage(page, "/signup", "Signup", 3500);
  await tourPage(page, "/login", "Login", 2500);
  await page.goto("/login?tab=child", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dwell(page, 1200);
  await tourPage(page, "/child-login", "Child login page", 2500);
  await tourPage(page, "/forgot-password", "Forgot password", 2000);

  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dwell(page, 600);
  await page.getByRole("tab", { name: "Parent" }).click();
  await page.locator("#pl-email").fill(parentEmail);
  await page.locator("#pl-password").fill(parentPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 90_000 });
  await dwell(page, 1500);

  await tourPage(page, "/parent/dashboard", "Parent dashboard", 5500);
  await tourPage(page, "/parent/tasks", "Parent tasks", 5000);
  await tourPage(page, "/parent/ai", "Parent AI", 5000);
  await tourPage(page, "/parent/settings", "Parent settings", 5000);
  await tourPage(page, "/parent/onboarding", "Parent onboarding", 3500);

  await page.goto("/parent/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dwell(page, 1200);
  const childView = page.getByRole("button", { name: "Child view" }).first();
  await expect(childView).toBeVisible({ timeout: 30_000 });
  await childView.click();
  await expect(page).toHaveURL(/\/child\/dashboard/, { timeout: 60_000 });
  await dwell(page, 1500);
  await tourPage(page, "/child/dashboard", "Child dashboard", 5500);

  const uplink = page.getByRole("button", { name: /Evidence uplink/i });
  if (await uplink.isVisible().catch(() => false)) {
    await uplink.click();
    await expect(page.getByRole("heading", { name: "Evidence uplink" })).toBeVisible({ timeout: 30_000 });
    await dwell(page, 1500);
    const noteField = page.getByRole("textbox", { name: /Note for parent/i });
    if (await noteField.isVisible().catch(() => false)) {
      await noteField.fill("Deployment verification recording.");
    }
    const gallery = page.locator("#evidence-gallery");
    if (await gallery.isVisible().catch(() => false)) {
      await gallery.setInputFiles({
        name: "evidence.png",
        mimeType: "image/png",
        buffer: Buffer.from(tinyPngBase64, "base64"),
      });
      await expect(page.getByText(/Locked in:/)).toBeVisible({ timeout: 20_000 });
      await dwell(page, 1200);
      const submitBtn = page.getByRole("button", { name: /Submit for review|Submitted successfully/i });
      await submitBtn.click();
      await expect(page.getByRole("button", { name: "Submitted successfully" })).toBeVisible({ timeout: 90_000 });
      await dwell(page, 3000);
    }
  }

  await tourPage(page, "/child/ai", "Child AI", 4500);

  await page.goto("/child/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 });
  await dwell(page, 800);
  const switchParent = page.getByRole("button", { name: "Switch to Parent" });
  if (await switchParent.isVisible().catch(() => false)) {
    await switchParent.click();
    await expect(page.getByRole("heading", { name: "Parent access" })).toBeVisible({ timeout: 20_000 });
    await page.getByLabel("Parent PIN").fill("1234");
    await page.getByRole("button", { name: "Unlock parent mode" }).click();
    await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 60_000 });
    await dwell(page, 1500);
  }

  // eslint-disable-next-line no-console
  console.log(
    "[live tour] Finished. WebM path is printed by Playwright under test-results/ (see last test output line).",
  );
});
