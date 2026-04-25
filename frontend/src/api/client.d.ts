export const API_BASE: string;

export class ApiRequestError extends Error {
  statusCode: number;
  details: unknown;
  constructor(message: string, statusCode: number, details?: unknown);
}

export function apiRequest(
  path: string,
  options?: { method?: string; body?: unknown; token?: string }
): Promise<unknown>;
