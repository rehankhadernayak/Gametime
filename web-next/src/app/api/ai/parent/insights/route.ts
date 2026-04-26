import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { apiProxyTarget } from "@/lib/apiProxyTarget";

export const runtime = "edge";

const UPSTREAM_PATH = "/ai/parent/insights";

function bearerFromRequest(request: Request): string | null {
  const raw = request.headers.get("authorization")?.trim();
  if (!raw?.toLowerCase().startsWith("bearer ")) return null;
  const t = raw.slice(7).trim();
  return t || null;
}

export async function GET(request: Request) {
  const bearer = bearerFromRequest(request);
  if (!bearer) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  try {
    const { payload } = await jwtVerify(bearer, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "parent") {
      return NextResponse.json({ error: "Parent access required" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const upstream = await fetch(`${apiProxyTarget()}${UPSTREAM_PATH}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json",
    },
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}
