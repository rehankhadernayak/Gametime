import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import {
  PARENT_TOKEN_ESCROW_COOKIE,
  setUserRoleCookie,
  TOKEN_COOKIE,
  maxAgeSecondsFromJwtExp,
  sessionCookieBaseOptions,
} from "@/lib/auth/sessionCookies";

function bearerFromRequest(request: Request): string | null {
  const raw = request.headers.get("authorization")?.trim();
  if (!raw?.toLowerCase().startsWith("bearer ")) return null;
  const t = raw.slice(7).trim();
  return t || null;
}

/**
 * Sets `user_role` (and optionally `gametime_token`) from a verified JWT.
 * Used after parent/child login so middleware RBAC matches the session cookie.
 */
export async function POST(request: Request) {
  const bearer = bearerFromRequest(request);
  if (!bearer) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  let role: string;
  let exp: number | undefined;
  try {
    const { payload } = await jwtVerify(bearer, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    role = typeof payload.role === "string" ? payload.role : "";
    exp = typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (role !== "parent" && role !== "child") {
    return NextResponse.json({ error: "Unsupported role" }, { status: 400 });
  }

  const maxAge = maxAgeSecondsFromJwtExp(exp);
  const base = sessionCookieBaseOptions();

  const res = NextResponse.json({ ok: true, role });

  res.cookies.set(TOKEN_COOKIE, bearer, {
    ...base,
    httpOnly: true,
    maxAge,
  });

  setUserRoleCookie(res, role, maxAge);

  if (role === "parent") {
    res.cookies.set(PARENT_TOKEN_ESCROW_COOKIE, "", {
      ...base,
      httpOnly: true,
      maxAge: 0,
    });
  }

  return res;
}
