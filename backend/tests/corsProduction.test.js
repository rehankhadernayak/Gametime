import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadAppWithEnv(overrides) {
  vi.resetModules();
  Object.assign(process.env, {
    DATABASE_PATH: ORIGINAL_ENV.DATABASE_PATH || '/tmp/gametime-cors-test.db',
    USE_SQLITE_FALLBACK: 'true',
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '2h',
    DATA_ENCRYPTION_KEY: 'test-data-encryption-key-1234567890',
    SKIP_MX_VALIDATION: 'true',
    ATHENA_ENABLED: 'false',
    ...overrides
  });
  const { createApp } = await import('../src/app.js');
  return createApp();
}

describe('CORS production allowlist', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  test('blocks unknown origins in production when reflect mode is off', async () => {
    const app = await loadAppWithEnv({
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://gametime.app',
      CORS_REFLECT_ORIGIN: undefined
    });

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured production frontend origin', async () => {
    const app = await loadAppWithEnv({
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://gametime.app',
      CORS_REFLECT_ORIGIN: undefined
    });

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://gametime.app');

    expect(res.headers['access-control-allow-origin']).toBe('https://gametime.app');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('allows any origin in development (reflect mode)', async () => {
    const app = await loadAppWithEnv({
      NODE_ENV: 'development',
      FRONTEND_ORIGIN: 'http://localhost:5173'
    });

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBe('https://evil.example.com');
  });

  test('allows GitHub Codespaces origins in production allowlist', async () => {
    const app = await loadAppWithEnv({
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://gametime.app',
      CORS_REFLECT_ORIGIN: undefined
    });

    const origin = 'https://ideal-sniffle-4000.app.github.dev';
    const res = await request(app)
      .get('/health')
      .set('Origin', origin);

    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });
});
