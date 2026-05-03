const STORAGE_KEY = "gametime_analytics_events";
const MAX_EVENTS = 1000;

function appendEvent(event: Record<string, unknown>) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as unknown[];
    const next = [...existing, event].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  const event = {
    name,
    payload,
    ts: new Date().toISOString(),
  };
  appendEvent(event);
}
