import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import {
  PARENT_TOKEN_ESCROW_COOKIE,
  TOKEN_COOKIE,
  USER_ROLE_COOKIE,
  maxAgeSecondsFromJwtExp,
  sessionCookieBaseOptions,
} from "@/lib/auth/sessionCookies";
import { apiProxyTarget } from "@/lib/apiProxyTarget";

const CHILD_LOGIN_PATH = "/auth/child-login";

function bearerFromRequest(request: Request): string | null {
  const raw = request.headers.get("authorization")?.trim();
  if (!raw?.toLowerCase().startsWith("bearer ")) return null;
  const t = raw.slice(7).trim();
  return t || null;
}

export async function POST(request: Request) {
  const parentToken = bearerFromRequest(request);
  if (!parentToken) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let parentPayload: { role?: unknown; exp?: number };
  try {
    const { payload } = await jwtVerify(parentToken, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    parentPayload = payload as { role?: unknown; exp?: number };
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (parentPayload.role !== "parent") {
    return NextResponse.json({ error: "Parent session required" }, { status: 403 });
  }

  let childId: string;
  try {
    const body = (await request.json()) as { childId?: unknown };
    childId = typeof body.childId === "string" ? body.childId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!childId) {
    return NextResponse.json({ error: "childId is required" }, { status: 400 });
  }

  const upstream = await fetch(`${apiProxyTarget()}${CHILD_LOGIN_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${parentToken}`,
    },
    body: JSON.stringify({ childId }),
  });

  const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
  if (!upstream.ok) {
    const msg = typeof data.error === "string" ? data.error : "Child switch failed";
    return NextResponse.json({ error: msg, details: data.details }, { status: upstream.status });
  }

  const childToken = typeof data.token === "string" ? data.token : "";
  if (!childToken) {
    return NextResponse.json({ error: "Upstream did not return a token" }, { status: 502 });
  }

  let childExp: number | undefined;
  try {
    const { payload } = await jwtVerify(childToken, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    childExp = typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid child token from upstream" }, { status: 502 });
  }

  const maxAge = maxAgeSecondsFromJwtExp(childExp);
  const base = sessionCookieBaseOptions();

  const res = NextResponse.json({
    token: childToken,
    child: data.child ?? null,
  });

  res.cookies.set(PARENT_TOKEN_ESCROW_COOKIE, parentToken, {
    ...base,
    httpOnly: true,
    maxAge,
  });
  res.cookies.set(TOKEN_COOKIE, childToken, {
    ...base,
    httpOnly: true,
    maxAge,
  });
  res.cookies.set(USER_ROLE_COOKIE, "child", {
    ...base,
    httpOnly: false,
    maxAge,
  });

  return res;
}
