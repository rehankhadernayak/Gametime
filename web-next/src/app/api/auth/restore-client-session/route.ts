import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/auth/sessionCookies";

import { apiProxyTarget } from "@/lib/apiProxyTarget";

/**
 * When `gametime_auth` is missing from localStorage but the httpOnly `gametime_token`
 * cookie is still valid (e.g. user cleared site data except cookies), restores SPA auth
 * from the cookie so dashboards load without signing in again.
 */
export async function POST() {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value?.trim();
  if (!token) {
    return NextResponse.json({ error: "No session cookie" }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let role: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    role = typeof payload.role === "string" ? payload.role : "";
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  if (role !== "parent" && role !== "child") {
    return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
  }

  let user: unknown = null;
  try {
    const meRes = await fetch(`${apiProxyTarget()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (meRes.ok) {
      const meData = (await meRes.json()) as { user?: unknown };
      user = meData.user ?? null;
    }
  } catch {
    /* user stays null */
  }

  return NextResponse.json({ token, role, user });
}
