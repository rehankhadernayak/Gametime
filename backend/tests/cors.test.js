import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalCorsReflect = process.env.CORS_REFLECT_ORIGIN;
const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
const originalSqliteFallback = process.env.USE_SQLITE_FALLBACK;
const originalDatabasePath = process.env.DATABASE_PATH;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.CORS_REFLECT_ORIGIN = originalCorsReflect;
  process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
  process.env.USE_SQLITE_FALLBACK = originalSqliteFallback;
  process.env.DATABASE_PATH = originalDatabasePath;
  vi.resetModules();
});

async function createProductionApp() {
  vi.resetModules();
  process.env.NODE_ENV = 'production';
  process.env.CORS_REFLECT_ORIGIN = 'false';
  process.env.FRONTEND_ORIGIN = 'https://app.gametime.sg';
  process.env.USE_SQLITE_FALLBACK = 'true';
  process.env.DATABASE_PATH = '/tmp/gametime-cors-test.db';
  process.env.JWT_SECRET = 'test-secret-for-cors';
  process.env.DATA_ENCRYPTION_KEY = 'test-data-encryption-key-1234567890';
  const { createApp } = await import('../src/app.js');
  return createApp();
}

describe('CORS production allowlist', () => {
  test('blocks unknown origins in production', async () => {
    const app = await createProductionApp();

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured frontend origin in production', async () => {
    const app = await createProductionApp();

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://app.gametime.sg')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.gametime.sg');
  });
});
