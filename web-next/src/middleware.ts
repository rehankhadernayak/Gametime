import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** Matches backend `authController` / session route — httpOnly cookie set on login. */
const TOKEN_COOKIE = "gametime_token";

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const token = request.cookies.get(TOKEN_COOKIE)?.value?.trim();
  if (!token) {
    return redirectToLogin(request);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail closed: without the backend secret we cannot confirm the JWT.
    return redirectToLogin(request);
  }

  let role: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    role = typeof payload.role === "string" ? payload.role : "";
  } catch {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/parent") && role !== "parent") {
    return redirectToLogin(request);
  }
  if (pathname.startsWith("/child") && role !== "child") {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/parent/:path*", "/child/:path*"],
};
