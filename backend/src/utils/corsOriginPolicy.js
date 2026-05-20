import { httpsVercelAppWildcardConfigured, isHttpsVercelAppOrigin } from './corsOrigins.js';

/** Strip whitespace and trailing slash so `https://app.com/` matches `https://app.com`. */
export function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/\/$/, '');
}

export function isDevTunnelOrigin(origin, nodeEnv) {
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
 * Builds the `cors` package options object (including `origin`) for Express.
 * In production without `corsReflectOrigin`, only FRONTEND_ORIGIN entries (plus
 * localhost dev ports, optional `*.vercel.app` wildcard, Codespaces, and dev
 * tunnel hosts outside production) may reflect credentialed responses.
 */
export function createCorsOptions({ nodeEnv, corsReflectOrigin, frontendOrigins, logger }) {
  const allowAllHttpsVercelApp =
    httpsVercelAppWildcardConfigured(frontendOrigins);
  const allowedOrigins = new Set(
    [
      ...frontendOrigins.filter((o) => !/^https:\/\/\*\.vercel\.app\/?$/i.test(String(o).trim())),
      // Local web + tooling (Vite default, CRA, preview, Expo web)
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

  const corsShared = {
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
    maxAge: 86400
  };

  const useReflectCorsOrigin =
    nodeEnv !== 'production' || corsReflectOrigin === true;

  if (useReflectCorsOrigin) {
    return {
      ...corsShared,
      origin: true
    };
  }

  return {
    ...corsShared,
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
