import { trackEvent } from '../utils/analytics.js';

export const API_BASE = String(import.meta.env?.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

const DEMO_MODE_STORAGE_KEY = 'gametime_demo_mode';
const REVIEWER_DEMO_PARENT_EMAILS = String(import.meta.env?.VITE_REVIEWER_DEMO_PARENT_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** 1×1 transparent PNG — used for reviewer demo mode (no camera/file required). */
export const DEMO_EVIDENCE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const REQUEST_TIMEOUT_MS = 15000;

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

  trackEvent('api_request_succeeded', {
    path,
    method,
    statusCode: response.status,
    durationMs: Date.now() - startTs
  });
  return data;
}
