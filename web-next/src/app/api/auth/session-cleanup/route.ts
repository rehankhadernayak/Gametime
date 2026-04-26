import { NextResponse } from "next/server";
import { clearParentEscrowAndUserRole } from "@/lib/auth/sessionCookies";

/**
 * Clears non-auth dashboard cookies after logout (escrow + user_role).
 * httpOnly `gametime_token` is cleared by the backend logout handler.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearParentEscrowAndUserRole(res);
  return res;
}
