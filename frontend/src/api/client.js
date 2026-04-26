import { trackEvent } from '../utils/analytics.js';

function backendLooksLoopback(url) {
  return (
    /(^|\/)localhost(:\d+)?(\/|$)/i.test(url) ||
    /127\.0\.0\.1/.test(url) ||
    /\[:?:1\]/.test(url)
  );
}

function resolveApiBase() {
  const nextPublic =
    typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
      ? String(process.env.NEXT_PUBLIC_API_URL).trim()
      : '';
  const explicit = nextPublic.replace(/\/$/, '');

  // Mirror web-next `getApiBase`: browser uses same-origin `/api` unless a reachable explicit API URL is set.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const pageIsLoopback =
      host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '';
    if (explicit) {
      if (backendLooksLoopback(explicit) && !pageIsLoopback) {
        return '/api';
      }
      return explicit;
    }
    return '/api';
  }

  if (explicit) return explicit;

  const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
  if (viteEnv) {
    const explicitApi = viteEnv.VITE_API_BASE_URL || viteEnv.VITE_API_URL || '';
    return String(
      viteEnv.DEV && !explicitApi ? '/api' : explicitApi || 'http://127.0.0.1:4000'
    ).replace(/\/$/, '');
  }

  // Next.js (and other bundles without Vite env): browser hits same-origin rewrites.
  if (typeof window !== 'undefined') {
    return '/api';
  }

  return 'http://127.0.0.1:4000';
}

// Same-origin `/api` in Vite dev (proxy) or when NEXT_PUBLIC_API_URL is set for Next.js.
export const API_BASE = resolveApiBase();
const REQUEST_TIMEOUT_MS = 15000;

export class ApiRequestError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body, token, suppressErrorToast = false } = {}) {
  const startTs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    const message = timedOut
      ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
      : `Network request failed. Check backend at ${API_BASE}`;

    const apiError = new ApiRequestError(message, 0);
    trackEvent('api_request_failed', {
      path,
      method,
      statusCode: 0,
      durationMs: Date.now() - startTs,
      error: apiError.message
    });
    if (typeof window !== 'undefined' && !suppressErrorToast) {
      window.dispatchEvent(
        new CustomEvent('gametime:toast', {
          detail: {
            type: 'error',
            title: 'Network error',
            message: apiError.message
          }
        })
      );
    }
    throw apiError;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = data.error || 'Request failed';
    if (message === 'Validation failed' && Array.isArray(data.details) && data.details.length > 0) {
      const first = data.details[0];
      message = first?.path ? `${first.path}: ${first.message}` : (first?.message || message);
    }
    const error = new ApiRequestError(message, response.status, data.details ?? null);
    trackEvent('api_request_failed', {
      path,
      method,
      statusCode: response.status,
      durationMs: Date.now() - startTs,
      error: error.message
    });

    if (typeof window !== 'undefined') {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('gametime:session-expired', { detail: { path, method } }));
      }

      if (!suppressErrorToast) {
        window.dispatchEvent(
          new CustomEvent('gametime:toast', {
            detail: {
              type: 'error',
              title: 'Request failed',
              message: error.message
            }
          })
        );
      }
    }
    throw error;
  }

  trackEvent('api_request_succeeded', {
    path,
    method,
    statusCode: response.status,
    durationMs: Date.now() - startTs
  });
  return data;
}

/** Global toast for successful destructive removals (type: error + trash icon per product spec). */
export function pushDeletionToast({ message, title = 'Removed' } = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gametime:toast', {
      detail: {
        type: 'error',
        title,
        message,
        icon: '🗑️'
      }
    })
  );
}
