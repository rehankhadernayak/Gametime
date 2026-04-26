import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { apiProxyTarget } from "@/lib/apiProxyTarget";

export const runtime = "edge";

const UPSTREAM_PATH = "/ai/chat";

/** Strip hop-by-hop headers when tunneling a proxied response body. */
function filterProxyResponseHeaders(upstream: Response): Headers {
  const out = new Headers(upstream.headers);
  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
  ]);
  for (const k of hopByHop) {
    out.delete(k);
  }
  return out;
}

function bearerFromRequest(request: Request): string | null {
  const raw = request.headers.get("authorization")?.trim();
  if (!raw?.toLowerCase().startsWith("bearer ")) return null;
  const t = raw.slice(7).trim();
  return t || null;
}

export async function POST(request: Request) {
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

  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const upstream = await fetch(`${apiProxyTarget()}${UPSTREAM_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body,
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || upstream.statusText, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "text/plain" },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: filterProxyResponseHeaders(upstream),
  });
}
