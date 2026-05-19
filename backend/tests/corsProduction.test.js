import path from 'path';
import os from 'os';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Regression: production must not reflect arbitrary Origins when credentials are enabled.
 * SameSite=None session cookies are sent on cross-site requests; permissive CORS would let
 * attacker.com read authenticated API responses in the browser.
 */
describe('CORS in production mode', () => {
  const baselineEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in baselineEnv)) delete process.env[k];
    }
    for (const [k, v] of Object.entries(baselineEnv)) {
      process.env[k] = v;
    }
  });

  test('blocks disallowed Origin on preflight (no Access-Control-Allow-Origin echo)', async () => {
    const dbFile = path.join(os.tmpdir(), `gametime-cors-prod-${Date.now()}.db`);
    Object.assign(process.env, {
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-test-jwt-secret-not-the-dev-placeholder-xyz',
      DATA_ENCRYPTION_KEY: 'prod-test-data-encryption-key-not-dev-default',
      USE_SQLITE_FALLBACK: 'true',
      DATABASE_PATH: dbFile,
      FRONTEND_ORIGIN: 'https://app.trusted.example',
      CORS_REFLECT_ORIGIN: '',
      SKIP_MX_VALIDATION: 'true'
    });

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://malicious.example')
      .set('Access-Control-Request-Method', 'GET');

    // When origin is denied, cors@2 calls `next()` instead of ending the preflight;
    // status may fall through to another handler. The security invariant is: no ACAO.
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured FRONTEND_ORIGIN on preflight', async () => {
    const dbFile = path.join(os.tmpdir(), `gametime-cors-prod-ok-${Date.now()}.db`);
    Object.assign(process.env, {
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-test-jwt-secret-not-the-dev-placeholder-xyz',
      DATA_ENCRYPTION_KEY: 'prod-test-data-encryption-key-not-dev-default',
      USE_SQLITE_FALLBACK: 'true',
      DATABASE_PATH: dbFile,
      FRONTEND_ORIGIN: 'https://app.trusted.example',
      CORS_REFLECT_ORIGIN: '',
      SKIP_MX_VALIDATION: 'true'
    });

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://app.trusted.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.trusted.example');
  });
});
