import { httpsVercelAppWildcardConfigured, isHttpsVercelAppOrigin } from '../utils/corsOrigins.js';

/** Strip whitespace and trailing slash so `https://app.com/` matches `https://app.com`. */
export function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/\/$/, '');
}

function isDevTunnelOrigin(origin, nodeEnv) {
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
function isCodespacesLikeOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname;
    return h.endsWith('.github.dev') || h.endsWith('.app.github.dev');
  } catch {
    return false;
  }
}

/** Build CORS origin handling: permissive reflect (dev / CORS_REFLECT_ORIGIN) vs production allowlist. */
export function buildCorsOriginConfig({ nodeEnv, corsReflectOrigin, frontendOrigins, logger }) {
  const useReflectCorsOrigin = nodeEnv !== 'production' || corsReflectOrigin === true;

  if (useReflectCorsOrigin) {
    return { mode: 'reflect' };
  }

  const allowAllHttpsVercelApp = httpsVercelAppWildcardConfigured(frontendOrigins);
  const allowedOrigins = new Set(
    [
      ...frontendOrigins.filter((o) => !/^https:\/\/\*\.vercel\.app\/?$/i.test(String(o).trim())),
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

  return {
    mode: 'allowlist',
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has(normalized)) return callback(null, true);
      if (allowAllHttpsVercelApp && isHttpsVercelAppOrigin(origin)) return callback(null, true);
      if (isDevTunnelOrigin(origin, nodeEnv)) return callback(null, true);
      if (isCodespacesLikeOrigin(origin)) return callback(null, true);
      logger.warn({ origin }, 'CORS request blocked for origin');
      return callback(null, false);
    }
  };
}
