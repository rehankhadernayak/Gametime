import { trackEvent } from '../utils/analytics.js';

/**
 * Backend origin for browser `fetch()` calls (no trailing slash). Set `VITE_API_URL` in
 * Codespaces / `.env` to your reachable API (e.g. forwarded port URL). When empty, the
 * client uses same-origin `/api`, which Vite proxies to `localhost:4000` in dev — see
 * `frontend/vite.config.js`.
 */
const viteApiUrl = String(import.meta.env?.VITE_API_URL ?? '').trim();
/** Legacy alias only; prefer `VITE_API_URL`. */
const viteApiBaseUrl = String(import.meta.env?.VITE_API_BASE_URL ?? '').trim();

const resolvedApiBase = viteApiUrl || viteApiBaseUrl || '/api';

if (import.meta.env.PROD && !viteApiUrl) {
  const usingLegacy = Boolean(viteApiBaseUrl);
  console.error(
    '[Gametime] Missing VITE_API_URL in this production build. ' +
      (usingLegacy
        ? 'Requests use legacy VITE_API_BASE_URL; migrate to VITE_API_URL so builds match your AWS API hostname.\n'
        : 'API requests fall back to same-origin `/api`, which will not reach your AWS backend — login and all API calls will fail.\n') +
      'Fix: Vercel → Project → Settings → Environment Variables → add VITE_API_URL (Production) = https://<your-aws-api-host> (no trailing slash), then redeploy.'
  );
}

export const API_BASE = String(resolvedApiBase).replace(/\/$/, '');

const DEMO_MODE_STORAGE_KEY = 'gametime_demo_mode';
const REVIEWER_DEMO_PARENT_EMAILS = String(import.meta.env?.VITE_REVIEWER_DEMO_PARENT_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** 1×1 transparent PNG — used for reviewer demo mode (no camera/file required). */
export const DEMO_EVIDENCE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_ERROR_BODY_CHARS = 4000;

function truncateForErrorMessage(text) {
  const s = String(text ?? '');
  if (s.length <= MAX_ERROR_BODY_CHARS) return s || '(empty body)';
  return `${s.slice(0, MAX_ERROR_BODY_CHARS)}… (${s.length} characters total)`;
}

/**
 * When true, Stripe checkout is not called and task completion can use built-in demo evidence
 * (no camera or file picker required). Toggle via localStorage or `?demo=1` on first load.
 */
export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === '1';
}

export function setDemoMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, '1');
  else window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
}

export function isReviewerDemoParentEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return false;
  return REVIEWER_DEMO_PARENT_EMAILS.includes(e);
}

export function syncDemoModeFromUrl() {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search).get('demo');
  if (q === '1' || q === 'true') setDemoMode(true);
  if (q === '0' || q === 'false') setDemoMode(false);
}

function isStripeCheckoutPath(path) {
  const p = String(path || '');
  return (
    p === '/stripe/checkout' ||
    p.endsWith('/stripe/checkout') ||
    p.includes('/billing/create-checkout')
  );
}

function mockStripeCheckoutResponse() {
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
  return {
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/parent/dashboard?topup=success`
  };
}

export class ApiRequestError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body, token, suppressErrorToast = false } = {}) {
  if (isDemoMode() && method === 'POST' && isStripeCheckoutPath(path)) {
    trackEvent('api_demo_stripe_bypass', { path });
    return mockStripeCheckoutResponse();
  }

  const startTs = Date.now();
  const requestUrl = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(requestUrl, {
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
      ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s at ${requestUrl}`
      : `Network request failed at ${requestUrl}: ${error?.message || 'no details'} (check backend URL and CORS)`;

    const apiError = new ApiRequestError(message, 0);
    trackEvent('api_request_failed', {
      path,
      method,
      statusCode: 0,
      durationMs: Date.now() - startTs,
      error: apiError.message
    });
    if (!suppressErrorToast) {
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

  const rawText = await response.text();
  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = undefined;
  }

  if (!response.ok) {
    if (data === undefined) {
      const message = `Web Request failed (${response.status}) at ${requestUrl} - Response: ${truncateForErrorMessage(rawText)}`;
      const error = new ApiRequestError(message, response.status, null);
      trackEvent('api_request_failed', {
        path,
        method,
        statusCode: response.status,
        durationMs: Date.now() - startTs,
        error: error.message
      });
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
      throw error;
    }

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
    throw error;
  }

  if (data === undefined) {
    const message = `Invalid JSON in response (${response.status}) at ${requestUrl} - Response: ${truncateForErrorMessage(rawText)}`;
    const error = new ApiRequestError(message, response.status, null);
    trackEvent('api_request_failed', {
      path,
      method,
      statusCode: response.status,
      durationMs: Date.now() - startTs,
      error: error.message
    });
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
