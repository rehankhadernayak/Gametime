import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_URL_KEY = 'gametime_mobile_api_url';
const DEMO_MODE_KEY = 'gametime_demo_mode';
const DEFAULT_WEB_API_URL = 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 15000;
let unauthorizedHandler = null;

/** Raw base64 body of a 1×1 PNG (no data: prefix) — demo evidence file. */
const DEMO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export { DEMO_PNG_BASE64 };

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

/**
 * Resolution order for the mobile API base URL:
 *   1. EXPO_PUBLIC_API_URL — baked in at build time via eas.json env
 *      (e.g. preview / production profiles); development builds omit it so
 *      host inference or manual settings apply.
 *   2. Expo Go dev host URI — when running `expo start`, point at the same
 *      machine the Metro bundler runs on (so the device can reach localhost).
 *   3. Fallback to localhost (web preview, simulator).
 *
 * Users can still override via the in-app ApiSettings screen, which is
 * persisted to AsyncStorage and takes priority over all of the above.
 */
function inferDefaultApiUrl() {
  const buildEnvUrl = process.env.EXPO_PUBLIC_API_URL;
  if (buildEnvUrl) return normalizeUrl(buildEnvUrl);

  if (Platform.OS === 'web') return DEFAULT_WEB_API_URL;

  const hostUri = String(
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.developer?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.experienceUrl ||
    ''
  ).replace(/^[a-z]+:\/\//, '');
  const host = hostUri.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:4000`;
  }
  return DEFAULT_WEB_API_URL;
}

export function getSuggestedApiUrl() {
  return inferDefaultApiUrl();
}

export class ApiError extends Error {
  constructor(message, statusCode, details = null, meta = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.requestUrl = meta.url ?? '';
    this.rawResponse = meta.rawResponse ?? '';
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

export async function getApiUrl() {
  const value = await AsyncStorage.getItem(API_URL_KEY);
  return value ? normalizeUrl(value) : inferDefaultApiUrl();
}

export async function setApiUrl(value) {
  const normalized = normalizeUrl(value);
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
}

export async function isDemoMode() {
  if (process.env.EXPO_PUBLIC_REVIEWER_DEMO === 'true') return true;
  const v = await AsyncStorage.getItem(DEMO_MODE_KEY);
  return v === '1';
}

export async function setDemoMode(enabled) {
  if (enabled) await AsyncStorage.setItem(DEMO_MODE_KEY, '1');
  else await AsyncStorage.removeItem(DEMO_MODE_KEY);
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
  return {
    url: 'gametime://demo-stripe-success'
  };
}

export async function apiRequest(path, { method = 'GET', token = '', body } = {}) {
  if ((await isDemoMode()) && method === 'POST' && isStripeCheckoutPath(path)) {
    return mockStripeCheckoutResponse();
  }

  const base = await getApiUrl();
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`
        : `Network request failed. Check API URL (${base}) and backend availability.`,
      0,
      null,
      { url: `${base}${path}`, rawResponse: '' }
    );
  } finally {
    clearTimeout(timeout);
  }

  const fullUrl = `${base}${path}`;
  const rawText = await response.text();
  let parsedBody;
  try {
    parsedBody = JSON.parse(rawText);
  } catch {
    parsedBody = undefined;
  }

  const isJsonObject =
    parsedBody !== null &&
    typeof parsedBody === 'object' &&
    !Array.isArray(parsedBody);

  if (!response.ok) {
    const maxPreview = 500;
    const truncatePreview = (s) =>
      String(s).length > maxPreview ? String(s).slice(0, maxPreview) + '…' : String(s);
    const rawForMeta =
      rawText.length > 8000 ? rawText.slice(0, 8000) + '…' : rawText;

    let message;
    let details = null;

    if (isJsonObject) {
      details = parsedBody.details ?? null;
      let friendly = parsedBody.error || `Request failed (${response.status})`;
      if (
        friendly === 'Validation failed' &&
        Array.isArray(parsedBody.details) &&
        parsedBody.details.length > 0
      ) {
        const first = parsedBody.details[0];
        friendly = first?.path
          ? `${first.path}: ${first.message}`
          : first?.message || friendly;
      }
      message = `Request failed (${response.status}) at ${fullUrl} - Response: ${truncatePreview(friendly)}`;
    } else {
      const snippet = (rawText || '').trim() || '(empty body)';
      message = `Request failed (${response.status}) at ${fullUrl} - Response: ${truncatePreview(snippet)}`;
    }

    if (response.status === 401 && token && unauthorizedHandler) {
      try {
        unauthorizedHandler();
      } catch {
        // Ignore unauthorized handler errors to avoid masking API response.
      }
    }
    throw new ApiError(message, response.status, details, {
      url: fullUrl,
      rawResponse: rawForMeta
    });
  }

  if (parsedBody === undefined) {
    return {};
  }
  return parsedBody;
}
