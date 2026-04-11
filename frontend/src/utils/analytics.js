const STORAGE_KEY = 'gametime_analytics_events';
const MAX_EVENTS = 1000;

function appendEvent(event) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const next = [...existing, event].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function trackEvent(name, payload = {}) {
  const event = {
    name,
    payload,
    ts: new Date().toISOString()
  };
  appendEvent(event);
  // Local analytics hook; wire to real provider later.
  console.info('[analytics]', event);
}

export function getTrackedEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}
