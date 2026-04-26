import { expect, test, type Page } from "@playwright/test";

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

let parentEmail: string;
let parentPassword: string;
let parentToken: string;
let childName: string;
let childEmail: string;
let childPassword: string;
let childId: string;
/** Task ids: closest due first (for smart default). */
let taskIds: string[];

async function cookieValue(page: Page, name: string): Promise<string | undefined> {
  const jar = await page.context().cookies("http://127.0.0.1:3000");
  return jar.find((c) => c.name === name)?.value;
}

function cardAroundHeading(page: Page, title: string) {
  return page.getByRole("heading", { name: title }).locator("xpath=ancestor::div[contains(@class,'card')][1]");
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  parentEmail = `pw-e2e-parent-${suffix}@gmail.com`;
  parentPassword = "E2E_parent_Strong1!";
  childName = "E2E Gamer Child";
  childEmail = `pw-e2e-child-${suffix}@gmail.com`;
  childPassword = "E2E_child_Strong1!";

  const signup = await apiJson("POST", "/auth/signup", {
    body: { name: "E2E Parent", email: parentEmail, password: parentPassword },
  });
  expect(signup.status, JSON.stringify(signup.body)).toBe(201);
  parentToken = String(signup.body.token ?? "");
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
  childId = String(childRes.body.id ?? "");
  expect(childId.length).toBeGreaterThan(10);

  const dueOrder = [isoDaysFromNow(3), isoDaysFromNow(5), isoDaysFromNow(2)];
  taskIds = [];
  for (let i = 0; i < 3; i++) {
    const title = `E2E Quest ${i + 1}`;
    const created = await apiJson("POST", "/tasks/create", {
      token: parentToken,
      body: {
        childId,
        title,
        description: `E2E quest ${i + 1} for smart default and evidence flows.`,
        points: 10,
        gpPoints: 0,
        dueDate: dueOrder[i],
        category: "chores",
      },
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const tid = String((created.body as { id?: string }).id ?? "");
    expect(tid.length).toBeGreaterThan(10);
    taskIds.push(tid);
  }
  expect(taskIds.length).toBe(3);
});

test.describe("Gametime web — comprehensive E2E", () => {
  test("1.x Auth, RBAC, parent gate", async ({ page }) => {
    test.setTimeout(180_000);
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/login");
    await page.getByRole("tab", { name: "Parent" }).click();
    await page.locator("#pl-email").fill(parentEmail);
    await page.locator("#pl-password").fill(parentPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/parent\/dashboard/);

    expect(await cookieValue(page, "user_role")).toBe("parent");
    expect(await cookieValue(page, "gametime_token")).toBeTruthy();

    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Parent dashboard" })).toBeVisible({ timeout: 30_000 });
    expect(await cookieValue(page, "user_role")).toBe("parent");

    await page.getByRole("button", { name: "Child view" }).first().click();
    await expect(page).toHaveURL(/\/child\/dashboard/, { timeout: 30_000 });
    expect(await cookieValue(page, "user_role")).toBe("child");
    expect(await cookieValue(page, "gametime_parent_token_escrow")).toBeTruthy();

    await page.goto("/parent/dashboard");
    await expect(page).toHaveURL(/\/child\/dashboard/);

    await page.getByRole("button", { name: "Switch to Parent" }).click();
    await expect(page.getByRole("heading", { name: "Parent access" })).toBeVisible();
    const pinInput = page.getByLabel("Parent PIN");
    await pinInput.fill("9999");
    await page.getByRole("button", { name: "Unlock parent mode" }).click();
    await expect(page.getByText(/Incorrect PIN/i)).toBeVisible();

    await pinInput.fill("1234");
    await page.getByRole("button", { name: "Unlock parent mode" }).click();
    await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 30_000 });
    expect(await cookieValue(page, "user_role")).toBe("parent");
    expect(await cookieValue(page, "gametime_parent_token_escrow")).toBeFalsy();

    if (consoleErrors.length) {
      // eslint-disable-next-line no-console
      console.warn("Browser console errors (1.x):", consoleErrors);
    }
  });

  test("2.x Child hub — smart default, focus, submit UX, 409 duplicate", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/login?tab=child");
    await page.getByRole("tab", { name: "Child" }).click();
    await page.locator("#cl-email").fill(childEmail);
    await page.locator("#cl-password").fill(childPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/child\/dashboard/);

    const closestId = taskIds[2];
    expect(closestId).toBeTruthy();

    const completePromise = page.waitForResponse(
      (res) => res.url().includes("/tasks/complete") && res.request().method() === "POST",
      { timeout: 60_000 },
    );

    await page.getByRole("button", { name: /Evidence uplink/i }).click();
    await expect(page.getByRole("heading", { name: "Evidence uplink" })).toBeVisible();
    await expect(page.locator("#child-task-select")).toHaveValue(closestId);

    const noteField = page.getByRole("textbox", { name: /Note for parent/i });
    await expect(noteField).toBeFocused();

    await page.locator("#evidence-gallery").setInputFiles({
      name: "evidence.png",
      mimeType: "image/png",
      buffer: Buffer.from(tinyPngBase64, "base64"),
    });
    await expect(page.getByText(/Locked in:/)).toBeVisible();

    const submitBtn = page.getByRole("button", { name: /Submit for review|Submitted successfully/i });
    await submitBtn.click();

    const completeRes = await completePromise;
    expect(completeRes.status()).toBe(200);

    const successBtn = page.getByRole("button", { name: "Submitted successfully" });
    await expect(successBtn).toBeVisible();
    await expect(successBtn).toContainText("✓");

    await expect
      .poll(async () => page.evaluate(() => document.querySelectorAll("canvas").length))
      .toBeGreaterThan(0);
    await expect(successBtn).toBeDisabled();
    const holdStart = Date.now();
    await expect(successBtn).toBeVisible();
    await page.waitForTimeout(5100);
    expect(Date.now() - holdStart).toBeGreaterThanOrEqual(4980);
    await expect(page.getByRole("heading", { name: "Evidence uplink" })).toBeHidden({ timeout: 8000 });

    const token = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("gametime_auth");
        if (!raw) return "";
        const j = JSON.parse(raw) as { token?: string };
        return j.token ?? "";
      } catch {
        return "";
      }
    });
    expect(token.length).toBeGreaterThan(10);

    const evidenceData = `data:image/png;base64,${tinyPngBase64}`;
    const dup = await apiJson("POST", "/tasks/complete", {
      token,
      body: {
        taskId: closestId,
        evidenceData,
        evidenceMime: "image/png",
        evidenceType: "Photo",
        evidenceNote: null,
      },
    });
    expect(dup.status).toBe(409);
  });

  test("3.x Parent dashboard — optimistic approve, silent refresh, rollback", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/login");
    await page.getByRole("tab", { name: "Parent" }).click();
    await page.locator("#pl-email").fill(parentEmail);
    await page.locator("#pl-password").fill(parentPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/parent\/dashboard/);

    const quest3Card = cardAroundHeading(page, "E2E Quest 3");
    await expect(quest3Card.getByText("Needs review")).toBeVisible({ timeout: 60_000 });

    const rosterRow = page.locator(".childRow, [class*='childRow']").filter({ hasText: childName }).first();
    const rpBeforeText = await rosterRow.textContent();
    const rpMatch = String(rpBeforeText ?? "").match(/RP\s+(\d+)/);
    const rpBefore = rpMatch ? Number.parseInt(rpMatch[1], 10) : NaN;
    expect(Number.isFinite(rpBefore)).toBeTruthy();

    const approveReq = page.waitForRequest((r) => r.url().includes("/tasks/approve") && r.method() === "POST");
    await quest3Card.getByRole("button", { name: "Approve" }).click();
    await expect(quest3Card).toBeHidden({ timeout: 8000 });
    await approveReq;

    await expect(page.locator('[aria-busy="true"][aria-label="Loading dashboard"]')).toHaveCount(0);
    await expect
      .poll(async () => {
        const t = await rosterRow.textContent();
        const m = String(t ?? "").match(/RP\s+(\d+)/);
        return m ? Number.parseInt(m[1], 10) : NaN;
      })
      .toBe(rpBefore + 10);

    const rollbackCreate = await apiJson("POST", "/tasks/create", {
      token: parentToken,
      body: {
        childId,
        title: "E2E Rollback Quest",
        description: "For optimistic rollback test",
        points: 10,
        gpPoints: 0,
        dueDate: isoDaysFromNow(4),
        category: "chores",
      },
    });
    expect(rollbackCreate.status).toBe(201);
    const rollbackTaskId = String((rollbackCreate.body as { id?: string }).id ?? "");

    const childLogin = await apiJson("POST", "/auth/child-login-direct", {
      body: { email: childEmail, password: childPassword },
    });
    expect(childLogin.status).toBe(200);
    const childTok = String(childLogin.body.token ?? "");
    const evidenceData = `data:image/png;base64,${tinyPngBase64}`;
    const sub = await apiJson("POST", "/tasks/complete", {
      token: childTok,
      body: {
        taskId: rollbackTaskId,
        evidenceData,
        evidenceMime: "image/png",
        evidenceType: "Photo",
        evidenceNote: null,
      },
    });
    expect(sub.status, JSON.stringify(sub.body)).toBe(200);

    await page.reload();
    const rollbackCard = cardAroundHeading(page, "E2E Rollback Quest");
    await expect(rollbackCard.getByRole("button", { name: "Approve" })).toBeVisible({ timeout: 60_000 });

    await page.route("**/tasks/approve", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "forced" }) });
    });

    await rollbackCard.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/500|forced|Approval failed|Internal/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(rollbackCard.getByRole("button", { name: "Approve" })).toBeVisible();
    await page.unroute("**/tasks/approve");

    await apiJson("DELETE", `/tasks/${rollbackTaskId}`, { token: parentToken }).catch(() => {});
  });

  test("4.1 Clock skew — Active quests not shown as Expired", async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => {
      const delta = 5 * 60 * 1000;
      const orig = Date.now.bind(Date);
      Date.now = () => orig() + delta;
    });

    await page.goto("/login?tab=child");
    await page.getByRole("tab", { name: "Child" }).click();
    await page.locator("#cl-email").fill(childEmail);
    await page.locator("#cl-password").fill(childPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/child\/dashboard/);

    const q1 = page.getByRole("heading", { name: "E2E Quest 1" }).locator("xpath=ancestor::*[contains(@class,'questCard')][1]");
    await expect(page.getByRole("heading", { name: "E2E Quest 1" }).first()).toBeVisible({ timeout: 60_000 });
    await expect(q1.getByText("Expired")).toHaveCount(0);
  });

  test("4.2 Real-time Supabase (optional env)", async ({ browser }) => {
    const hasSupabase = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    );
    test.skip(!hasSupabase, "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to run realtime assertions.");

    test.setTimeout(240_000);
    const rt = await apiJson("POST", "/tasks/create", {
      token: parentToken,
      body: {
        childId,
        title: "E2E Realtime Quest",
        description: "Realtime toast probe",
        points: 10,
        gpPoints: 0,
        dueDate: isoDaysFromNow(5),
        category: "chores",
      },
    });
    expect(rt.status).toBe(201);
    const rtTaskId = String((rt.body as { id?: string }).id ?? "");

    const childLogin = await apiJson("POST", "/auth/child-login-direct", {
      body: { email: childEmail, password: childPassword },
    });
    expect(childLogin.status).toBe(200);
    const childTok = String(childLogin.body.token ?? "");
    const evidenceData = `data:image/png;base64,${tinyPngBase64}`;
    const sub = await apiJson("POST", "/tasks/complete", {
      token: childTok,
      body: {
        taskId: rtTaskId,
        evidenceData,
        evidenceMime: "image/png",
        evidenceType: "Photo",
        evidenceNote: null,
      },
    });
    expect(sub.status).toBe(200);

    const parentCtx = await browser.newContext();
    const childCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    const childPage = await childCtx.newPage();

    await childPage.goto("/login?tab=child");
    await childPage.getByRole("tab", { name: "Child" }).click();
    await childPage.locator("#cl-email").fill(childEmail);
    await childPage.locator("#cl-password").fill(childPassword);
    await childPage.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(childPage).toHaveURL(/\/child\/dashboard/);

    await parentPage.goto("/login");
    await parentPage.getByRole("tab", { name: "Parent" }).click();
    await parentPage.locator("#pl-email").fill(parentEmail);
    await parentPage.locator("#pl-password").fill(parentPassword);
    await parentPage.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(parentPage).toHaveURL(/\/parent\/dashboard/);

    const rtCard = cardAroundHeading(parentPage, "E2E Realtime Quest");
    await rtCard.getByRole("button", { name: "Approve" }).click();

    await expect(childPage.getByText("Quest Status Updated!")).toBeVisible({ timeout: 45_000 });

    await parentCtx.close();
    await childCtx.close();

    await apiJson("DELETE", `/tasks/${rtTaskId}`, { token: parentToken }).catch(() => {});
  });

  test("5.x Z-index — modal above FAB; toast above modal", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/login?tab=child");
    await page.getByRole("tab", { name: "Child" }).click();
    await page.locator("#cl-email").fill(childEmail);
    await page.locator("#cl-password").fill(childPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/child\/dashboard/);

    await page.getByRole("button", { name: /Evidence uplink/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const zFab = await page.locator('[class*="evidenceFabWrap"]').first().evaluate((el) => {
      return Number.parseInt(getComputedStyle(el).zIndex, 10) || 0;
    });
    const zBackdrop = await page
      .locator('[role="presentation"]')
      .filter({ has: page.getByRole("dialog") })
      .first()
      .evaluate((el) => Number.parseInt(getComputedStyle(el).zIndex, 10) || 0);

    expect(zFab).toBe(700);
    expect(zBackdrop).toBe(900);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("gametime:toast", {
          detail: { type: "error", message: "E2E stacking probe — toast should win" },
        }),
      );
    });
    const zToast = await page.locator("[data-sonner-toaster]").evaluate((el) => {
      return Number.parseInt(getComputedStyle(el).zIndex, 10) || 0;
    });
    expect(zToast).toBe(1000);
    await expect(page.getByText("E2E stacking probe")).toBeVisible();
  });
});
