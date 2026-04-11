import { ApiError } from '../utils/errors.js';

const buckets = new Map();

// Prune expired buckets periodically to prevent unbounded memory growth.
const PRUNE_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, PRUNE_INTERVAL_MS).unref(); // .unref() so this timer doesn't block process exit

function getClientKey(req) {
  // Use the direct socket IP to prevent X-Forwarded-For spoofing by untrusted clients.
  // If the app is behind a trusted reverse proxy, configure express trust proxy instead.
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

export function createRateLimiter({ windowMs, maxRequests }) {
  return (req, _res, next) => {
    const now = Date.now();
    const key = `${req.path}:${getClientKey(req)}`;
    const existing = buckets.get(key);

    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > maxRequests) {
      return next(new ApiError(429, 'Too many requests. Please try again shortly.'));
    }

    return next();
  };
}
