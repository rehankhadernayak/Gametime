import { describe, expect, test } from 'vitest';
import { createStrictCorsOriginCallback, normalizeOrigin } from '../src/utils/corsAllowlist.js';

describe('createStrictCorsOriginCallback', () => {
  test('allows configured FRONTEND_ORIGIN hosts', async () => {
    const cb = createStrictCorsOriginCallback(['https://app.example.com']);
    const allowed = await new Promise((resolve) => {
      cb('https://app.example.com', (_err, ok) => resolve(ok));
    });
    expect(allowed).toBe(true);
  });

  test('denies arbitrary attacker-controlled origins (credentialed CORS leak)', async () => {
    const cb = createStrictCorsOriginCallback(['https://app.example.com']);
    const allowed = await new Promise((resolve) => {
      cb('https://evil.example', (_err, ok) => resolve(ok));
    });
    expect(allowed).toBe(false);
  });

  test('allows https preview under *.vercel.app when wildcard is configured', async () => {
    const cb = createStrictCorsOriginCallback(['https://*.vercel.app']);
    const allowed = await new Promise((resolve) => {
      cb('https://gametime-git-fix-abc123.vercel.app', (_err, ok) => resolve(ok));
    });
    expect(allowed).toBe(true);
  });

  test('requests with no Origin header are allowed (non-browser / same-site)', async () => {
    const cb = createStrictCorsOriginCallback(['https://app.example.com']);
    const allowed = await new Promise((resolve) => {
      cb(undefined, (_err, ok) => resolve(ok));
    });
    expect(allowed).toBe(true);
  });
});

describe('normalizeOrigin', () => {
  test('trims and strips trailing slash', () => {
    expect(normalizeOrigin('  https://x.com/  ')).toBe('https://x.com');
  });
});
