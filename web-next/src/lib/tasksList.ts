/** GET /tasks/list returns `{ serverTime, tasks }` (legacy: plain array). */

export type TasksListApiResponse = { serverTime?: number; tasks?: unknown[] };

export function normalizeTasksListResponse(raw: unknown): { tasks: unknown[]; serverTime: number | null } {
  if (Array.isArray(raw)) {
    return { tasks: raw, serverTime: null };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const tasks = Array.isArray(o.tasks) ? o.tasks : [];
    const st = o.serverTime;
    const serverTime =
      typeof st === "number" && Number.isFinite(st) ? st : null;
    return { tasks, serverTime };
  }
  return { tasks: [], serverTime: null };
}
