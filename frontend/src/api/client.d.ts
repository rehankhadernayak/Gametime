export const API_BASE: string;

/** Minimal PNG data URL for reviewer demo evidence (web). */
export const DEMO_EVIDENCE_PNG_DATA_URL: string;

export function isDemoMode(): boolean;
export function setDemoMode(enabled: boolean): void;
export function isReviewerDemoParentEmail(email: string | undefined | null): boolean;
export function syncDemoModeFromUrl(): void;

export class ApiRequestError extends Error {
  statusCode: number;
  details: unknown;
  constructor(message: string, statusCode: number, details?: unknown);
}

export function apiRequest(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    token?: string;
    suppressErrorToast?: boolean;
  }
): Promise<unknown>;
