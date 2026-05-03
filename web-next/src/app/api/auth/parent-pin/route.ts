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

const DEFAULT_DEV_PIN = "1234";

function expectedPin(): string {
  const fromEnv = process.env.PARENT_MODE_PIN?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_DEV_PIN;
}

export async function POST(request: Request) {
  let pin = "";
  try {
    const body = (await request.json()) as { pin?: unknown };
    pin = typeof body.pin === "string" ? body.pin.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (pin !== expectedPin()) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const jar = request.headers.get("cookie") ?? "";
  const getCookie = (name: string): string | undefined => {
    const parts = jar.split(";").map((p) => p.trim());
    for (const p of parts) {
      if (p.startsWith(`${name}=`)) {
        return decodeURIComponent(p.slice(name.length + 1));
      }
    }
    return undefined;
  };

  const escrow = getCookie(PARENT_TOKEN_ESCROW_COOKIE)?.trim();
  if (!escrow) {
    return NextResponse.json(
      { error: "No parent session to restore. Please sign out and sign in as a parent again." },
      { status: 400 },
    );
  }

  let exp: number | undefined;
  try {
    const { payload } = await jwtVerify(escrow, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "parent") {
      return NextResponse.json({ error: "Stored session is not a parent account" }, { status: 400 });
    }
    exp = typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return NextResponse.json({ error: "Parent session token is invalid or expired" }, { status: 401 });
  }

  const maxAge = maxAgeSecondsFromJwtExp(exp);
  const base = sessionCookieBaseOptions();

  let user: unknown = null;
  try {
    const meRes = await fetch(`${apiProxyTarget()}/auth/me`, {
      headers: { Authorization: `Bearer ${escrow}` },
    });
    if (meRes.ok) {
      const meData = (await meRes.json()) as { user?: unknown };
      user = meData.user ?? null;
    }
  } catch {
    /* user stays null; client still has cookie session */
  }

  const res = NextResponse.json({ ok: true, token: escrow, role: "parent" as const, user });

  res.cookies.set(TOKEN_COOKIE, escrow, {
    ...base,
    httpOnly: true,
    maxAge,
  });
  res.cookies.set(PARENT_TOKEN_ESCROW_COOKIE, "", {
    ...base,
    httpOnly: true,
    maxAge: 0,
  });
  res.cookies.set(USER_ROLE_COOKIE, "parent", {
    ...base,
    httpOnly: false,
    maxAge,
  });

  return res;
}
