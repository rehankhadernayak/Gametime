import { trackEvent } from "@/lib/analytics";

function explicitApiFromEnv(): string {
  return (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL?.trim()) || "";
}

/**
 * API origin for `fetch`. Resolved at call time in the browser so Cloudflare tunnels,
 * preview hosts, and phones work: same-origin `/api` rewrites to the backend unless
 * `NEXT_PUBLIC_API_URL` is a real reachable host (not loopback while the page is not).
 */
export function getApiBase(): string {
  const explicit = explicitApiFromEnv().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const pageIsLoopback =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "";
    if (explicit) {
      const backendLooksLoopback =
        /(^|\/)localhost(:\d+)?(\/|$)/i.test(explicit) ||
        /127\.0\.0\.1/.test(explicit) ||
        /\[:?:1\]/.test(explicit);
      if (backendLooksLoopback && !pageIsLoopback) {
        return "/api";
      }
      return explicit;
    }
    return "/api";
  }

  if (explicit) return explicit;
  return "http://127.0.0.1:4000";
}

const REQUEST_TIMEOUT_MS = 15000;

export class ApiRequestError extends Error {
  statusCode: number;
  details: unknown;

  constructor(message: string, statusCode: number, details: unknown = null) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export async function apiRequest<T = unknown>(
  path: string,
  { method = "GET", body, token }: ApiRequestOptions = {}
): Promise<T> {
  const base = getApiBase();
  const startTs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = (error as { name?: string })?.name === "AbortError";
    const message = timedOut
      ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
      : `Network request failed. Check backend at ${base}`;

    const apiError = new ApiRequestError(message, 0);
    trackEvent("api_request_failed", {
      path,
      method,
      statusCode: 0,
      durationMs: Date.now() - startTs,
      error: apiError.message,
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gametime:toast", {
          detail: {
            type: "error",
            title: "Network error",
            message: apiError.message,
          },
        })
      );
    }
    throw apiError;
  } finally {
    clearTimeout(timeout);
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    let message = (data.error as string) || "Request failed";
    if (
      message === "Validation failed" &&
      Array.isArray(data.details) &&
      (data.details as unknown[]).length > 0
    ) {
      const first = (data.details as { path?: string; message?: string }[])[0];
      message = first?.path
        ? `${first.path}: ${first.message}`
        : first?.message || message;
    }
    const err = new ApiRequestError(message, response.status, data.details ?? null);
    trackEvent("api_request_failed", {
      path,
      method,
      statusCode: response.status,
      durationMs: Date.now() - startTs,
      error: err.message,
    });

    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("gametime:session-expired", { detail: { path, method } })
      );
    }

    window.dispatchEvent(
      new CustomEvent("gametime:toast", {
        detail: {
          type: "error",
          title: "Request failed",
          message: err.message,
        },
      })
    );
    throw err;
  }

  trackEvent("api_request_succeeded", {
    path,
    method,
    statusCode: response.status,
    durationMs: Date.now() - startTs,
  });
  return data as T;
}
