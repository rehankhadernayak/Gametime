/**
 * Telemetry helpers for 1-bit StatusLine readouts (uppercase _AGO tokens).
 */

export function timeAgoTelemetry(isoString) {
  if (!isoString) return 'UNKNOWN';
  const t = new Date(isoString).getTime();
  if (Number.isNaN(t)) return 'UNKNOWN';
  const diffMs = Date.now() - t;
  if (diffMs < 0) return 'SYNCED';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'JUST_NOW';
  if (mins < 60) return `${mins}M_AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H_AGO`;
  const days = Math.floor(hrs / 24);
  return `${days}D_AGO`;
}

export function lastActivityIsoForChild(childId, tasks, activeSessions, childCreatedAt) {
  const session = activeSessions.find((s) => s.childId === childId && s.status === 'Started');
  if (session?.startedAt) return session.startedAt;

  const times = [];
  for (const task of tasks || []) {
    if (task.childId !== childId) continue;
    if (task.updatedAt) times.push(new Date(task.updatedAt).getTime());
    if (task.aiAnalyzedAt) times.push(new Date(task.aiAnalyzedAt).getTime());
  }
  if (times.length > 0) return new Date(Math.max(...times)).toISOString();
  if (childCreatedAt) return childCreatedAt;
  return null;
}

export function childTelemetry(childId, tasks, activeSessions, childCreatedAt) {
  const gaming = activeSessions.some((s) => s.childId === childId && s.status === 'Started');
  const status = gaming ? 'ONLINE' : 'OFFLINE';
  const iso = lastActivityIsoForChild(childId, tasks, activeSessions, childCreatedAt);
  const lastSync = gaming ? 'LIVE' : timeAgoTelemetry(iso);
  return { status, lastSync };
}
