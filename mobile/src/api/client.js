import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_URL_KEY = 'gametime_mobile_api_url';
const DEFAULT_WEB_API_URL = 'http://localhost:4000';
const REQUEST_TIMEOUT_MS = 15000;
let unauthorizedHandler = null;

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

/**
 * Resolution order for the mobile API base URL:
 *   1. EXPO_PUBLIC_API_URL — baked in at build time via eas.json env
 *      (production / preview / development profiles override this).
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
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
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

export async function apiRequest(path, { method = 'GET', token = '', body } = {}) {
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
      0
    );
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = data.error || `Request failed (${response.status})`;
    if (message === 'Validation failed' && Array.isArray(data.details) && data.details.length > 0) {
      const first = data.details[0];
      message = first?.path ? `${first.path}: ${first.message}` : (first?.message || message);
    }
    if (response.status === 401 && token && unauthorizedHandler) {
      try {
        unauthorizedHandler();
      } catch {
        // Ignore unauthorized handler errors to avoid masking API response.
      }
    }
    throw new ApiError(
      message,
      response.status,
      data.details ?? null
    );
  }
  return data;
}
