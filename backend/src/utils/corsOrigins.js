/**
 * When `https://*.vercel.app` appears in FRONTEND_ORIGIN, allow any browser origin
 * `https://<anything>.vercel.app` (Vercel preview + production *.vercel.app).
 * Browsers never send a literal `*` hostname — this is config-only syntax.
 */
const HTTPS_VERCEL_APP_WILDCARD = /^https:\/\/\*\.vercel\.app\/?$/i;

export function httpsVercelAppWildcardConfigured(frontendOrigins) {
  return (frontendOrigins || []).some((o) => HTTPS_VERCEL_APP_WILDCARD.test(String(o).trim()));
}

export function isHttpsVercelAppOrigin(origin) {
  try {
    const u = new URL(origin);
    return u.protocol === 'https:' && u.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}
