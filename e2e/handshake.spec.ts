import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:4000";
const CHORE_TITLE = "Playwright Task";
const TASK_POINTS = 10;

function dobYearsAgo(years: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return d.toISOString().slice(0, 10);
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
let childName: string;
let childEmail: string;
let childPassword: string;

test.beforeAll(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  parentEmail = `pw-parent-${suffix}@gmail.com`;
  parentPassword = "E2E_parent_Strong1!";
  childName = "Playwright Child";
  childEmail = `pw-child-${suffix}@gmail.com`;
  childPassword = "E2E_child_Strong1!";

  const signup = await apiJson("POST", "/auth/signup", {
    body: { name: "Playwright Parent", email: parentEmail, password: parentPassword },
  });
  expect(signup.status, `signup: ${JSON.stringify(signup.body)}`).toBe(201);
  const parentToken = String(signup.body.token ?? "");
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
  expect(childRes.status, `create child: ${JSON.stringify(childRes.body)}`).toBe(201);
});

test("parent → child evidence → parent approve updates RP", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByRole("tab", { name: "Parent" }).click();
  await page.locator("#pl-email").fill(parentEmail);
  await page.locator("#pl-password").fill(parentPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/);

  await page.goto("/parent/tasks");
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await page.getByRole("button", { name: "+ Add Task" }).click();
  await page.locator(".task-inline-input").first().fill(CHORE_TITLE);
  await page.locator(".task-inline-input").nth(1).fill("E2E chore description for Playwright.");
  await page.locator("tr.task-new-row select.task-inline-select").nth(1).selectOption({ label: childName });
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("strong.task-title-cell", { hasText: CHORE_TITLE })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/login?tab=child");
  await page.getByRole("tab", { name: "Child" }).click();
  await page.locator("#cl-email").fill(childEmail);
  await page.locator("#cl-password").fill(childPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/child\/dashboard/);

  const rpBeforeText = await page
    .locator('[aria-labelledby="rp-hero-label"] p[aria-live="polite"]')
    .first()
    .textContent();
  const rpBefore = Number.parseInt(String(rpBeforeText ?? "0").replace(/,/g, ""), 10);
  expect(Number.isFinite(rpBefore)).toBeTruthy();

  await page.getByRole("heading", { name: CHORE_TITLE }).click();
  await page.locator("#evidence-gallery").setInputFiles({
    name: "evidence.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByText(/Locked in:/)).toBeVisible();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText(/Task completion submitted|parent review/i)).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/login");
  await page.getByRole("tab", { name: "Parent" }).click();
  await page.locator("#pl-email").fill(parentEmail);
  await page.locator("#pl-password").fill(parentPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/parent\/dashboard/);

  await expect(page.getByRole("heading", { name: "Parent dashboard" })).toBeVisible();
  await expect(page.getByText(childName).first()).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/Task approved/i).first()).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText(new RegExp(`RP\\s+${rpBefore + TASK_POINTS}\\b`))).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
});
