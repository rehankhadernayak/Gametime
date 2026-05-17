import { httpsVercelAppWildcardConfigured, isHttpsVercelAppOrigin } from './corsOrigins.js';

/** Strip whitespace and trailing slash so `https://app.com/` matches `https://app.com`. */
export function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/\/$/, '');
}

export function isDevTunnelOrigin(origin, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === 'production') return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return (
      h.endsWith('.trycloudflare.com') ||
      h.endsWith('.cfargotunnel.com') ||
      h.endsWith('.cvm.dev')
    );
  } catch {
    return false;
  }
}

/** GitHub Codespaces / dev preview frontends (HTTPS, arbitrary subdomain). */
export function isCodespacesLikeOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return h.endsWith('.github.dev') || h.endsWith('.app.github.dev');
  } catch {
    return false;
  }
}

/**
 * Build the Set of explicitly allowed browser origins from `FRONTEND_ORIGIN` plus local dev ports.
 * @param {string[]} frontendOrigins — parsed `env.frontendOrigins`
 */
export function buildProductionAllowedOriginSet(frontendOrigins) {
  return new Set(
    [
      ...(frontendOrigins || []).filter(
        (o) => !/^https:\/\/\*\.vercel\.app\/?$/i.test(String(o).trim())
      ),
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:8081',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173',
      'http://127.0.0.1:8081'
    ].map(normalizeOrigin)
  );
}

/**
 * Returns a function suitable for the `cors` package `origin` callback (truthy = allow).
 * @param {string[]} frontendOrigins — parsed `env.frontendOrigins`
 * @param {string} [nodeEnv] — defaults to `process.env.NODE_ENV`
 */
export function createStrictCorsOriginValidator(frontendOrigins, nodeEnv = process.env.NODE_ENV) {
  const allowed = buildProductionAllowedOriginSet(frontendOrigins);
  const allowAllHttpsVercelApp = httpsVercelAppWildcardConfigured(frontendOrigins);
  return (origin) => {
    if (!origin) return true;
    if (allowed.has(normalizeOrigin(origin))) return true;
    if (allowAllHttpsVercelApp && isHttpsVercelAppOrigin(origin)) return true;
    if (isDevTunnelOrigin(origin, nodeEnv)) return true;
    if (isCodespacesLikeOrigin(origin)) return true;
    return false;
  };
}
