/**
 * Strips angle brackets and trims/truncates a string.
 * Used at service boundaries to prevent stored XSS via HTML injection.
 * React escapes output automatically, but we sanitize at write-time for defense in depth.
 */
export function sanitizeText(value, max = 200) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}
