import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const TOKEN_COOKIE = "gametime_token";

/**
 * Lightweight session probe for the marketing landing page.
 * Returns whether an auth cookie is present (value is opaque; do not expose JWT body).
 */
export async function GET() {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  return NextResponse.json({ token: token ?? null });
}
