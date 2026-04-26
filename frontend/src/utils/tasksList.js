/** GET /tasks/list returns `{ serverTime, tasks }` (legacy: plain array). */

export function normalizeTasksListResponse(raw) {
  if (Array.isArray(raw)) {
    return { tasks: raw, serverTime: null };
  }
  if (raw && typeof raw === 'object') {
    const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    const st = raw.serverTime;
    const serverTime = typeof st === 'number' && Number.isFinite(st) ? st : null;
    return { tasks, serverTime };
  }
  return { tasks: [], serverTime: null };
}
