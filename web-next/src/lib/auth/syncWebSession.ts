/**
 * Keeps httpOnly `gametime_token` and `user_role` cookies in sync with the JWT
 * the SPA holds in memory (localStorage). Required for Next.js middleware RBAC.
 */
export async function syncDashboardSessionCookies(token: string): Promise<void> {
  const res = await fetch("/api/auth/sync-session-cookies", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to sync session cookies");
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gametime:cookie-role-refresh"));
  }
}

export type SwitchToChildResponse = { token: string; child: unknown };

export async function switchToChildSession(parentToken: string, childId: string): Promise<SwitchToChildResponse> {
  const res = await fetch("/api/auth/switch-to-child", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({ childId }),
  });
  const data = (await res.json().catch(() => ({}))) as SwitchToChildResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Unable to open child view");
  }
  if (!data.token) {
    throw new Error("Unable to open child view");
  }
  return { token: data.token, child: data.child };
}

export type ParentPinSuccess = { token: string; user: unknown };

export async function verifyParentPin(pin: string): Promise<ParentPinSuccess> {
  const res = await fetch("/api/auth/parent-pin", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = (await res.json().catch(() => ({}))) as ParentPinSuccess & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "PIN verification failed");
  }
  return { token: data.token, user: data.user };
}

export async function clearDashboardSessionCookies(): Promise<void> {
  await fetch("/api/auth/session-cleanup", { method: "POST", credentials: "same-origin" });
}

export type RestoreClientSession = { token: string; role: string; user: unknown };

/** When localStorage is cleared but the httpOnly session cookie remains valid. */
export async function restoreAuthFromCookieSession(): Promise<RestoreClientSession | null> {
  const res = await fetch("/api/auth/restore-client-session", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as RestoreClientSession & { error?: string };
  if (!data.token) return null;
  return { token: data.token, role: data.role, user: data.user };
}
