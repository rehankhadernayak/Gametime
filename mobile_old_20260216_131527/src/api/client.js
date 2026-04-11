import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL_KEY = 'sidequest_api_url';

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

export async function getApiBaseUrl() {
  const saved = await AsyncStorage.getItem(API_URL_KEY);
  if (saved) return normalizeBaseUrl(saved);
  return normalizeBaseUrl(Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:4000');
}

export async function setApiBaseUrl(url) {
  const normalized = normalizeBaseUrl(url);
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
}

export class ApiError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const base = await getApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || 'Request failed', response.status, payload.details || null);
  }
  return payload;
}
