import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  TOKEN_COOKIE,
  USER_ROLE_COOKIE,
  maxAgeSecondsFromJwtExp,
  sessionCookieBaseOptions,
} from "@/lib/auth/sessionCookies";

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

function redirectToChildDashboard(request: NextRequest) {
  return NextResponse.redirect(new URL("/child/dashboard", request.url));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token = request.cookies.get(TOKEN_COOKIE)?.value?.trim();
  if (!token) {
    return redirectToLogin(request);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return redirectToLogin(request);
  }

  let role: string;
  let exp: number | undefined;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    role = typeof payload.role === "string" ? payload.role : "";
    exp = typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return redirectToLogin(request);
  }

  const maxAge = maxAgeSecondsFromJwtExp(exp);
  const base = sessionCookieBaseOptions();

  if (pathname.startsWith("/parent")) {
    if (role === "child") {
      return redirectToChildDashboard(request);
    }
    if (role !== "parent") {
      return redirectToLogin(request);
    }

    const res = NextResponse.next();
    res.headers.set("Cache-Control", "no-store, must-revalidate");
    res.cookies.set(USER_ROLE_COOKIE, "parent", { ...base, httpOnly: false, maxAge });
    return res;
  }

  if (pathname.startsWith("/child")) {
    if (role !== "child") {
      return redirectToLogin(request);
    }

    const res = NextResponse.next();
    res.cookies.set(USER_ROLE_COOKIE, "child", { ...base, httpOnly: false, maxAge });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/parent/:path*", "/child/:path*"],
};
