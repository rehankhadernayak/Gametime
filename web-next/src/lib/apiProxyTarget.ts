/**
 * Upstream Express API origin for server-side proxies (Route Handlers, not Edge-only).
 * Matches `next.config.ts` rewrites default.
 */
export function apiProxyTarget(): string {
  return (process.env.API_PROXY_TARGET || "http://127.0.0.1:4000").replace(/\/$/, "");
}
