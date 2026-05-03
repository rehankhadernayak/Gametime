import type { NextResponse } from "next/server";

/** httpOnly session JWT (set by backend login and web-next switch route). */
export const TOKEN_COOKIE = "gametime_token";
/** Parent JWT held while browsing as child (httpOnly); restored after PIN. */
export const PARENT_TOKEN_ESCROW_COOKIE = "gametime_parent_token_escrow";
/** Effective dashboard role for RBAC in middleware (`parent` | `child`). Not httpOnly. */
export const USER_ROLE_COOKIE = "user_role";

export type UserRoleCookie = "parent" | "child";

export function sessionCookieBaseOptions(): {
  path: string;
  sameSite: "lax" | "none";
  secure: boolean;
} {
  const isProd = process.env.NODE_ENV === "production";
  return {
    path: "/",
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  };
}

/** maxAge for cookies in seconds (Next.js `cookies().set` / `Response.cookies.set`). */
export function maxAgeSecondsFromJwtExp(exp: number | undefined): number {
  if (typeof exp !== "number" || !Number.isFinite(exp)) return 60 * 60 * 2;
  const left = exp - Math.floor(Date.now() / 1000);
  return Math.max(60, left);
}

export function clearParentEscrowAndUserRole(res: NextResponse): void {
  const base = sessionCookieBaseOptions();
  res.cookies.set(PARENT_TOKEN_ESCROW_COOKIE, "", { ...base, maxAge: 0, httpOnly: true });
  res.cookies.set(USER_ROLE_COOKIE, "", { ...base, maxAge: 0, httpOnly: false });
}

export function setUserRoleCookie(res: NextResponse, role: UserRoleCookie, maxAge: number): void {
  const base = sessionCookieBaseOptions();
  res.cookies.set(USER_ROLE_COOKIE, role, { ...base, maxAge, httpOnly: false });
}
