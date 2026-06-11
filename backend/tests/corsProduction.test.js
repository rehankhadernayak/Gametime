import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const ORIGINAL_CORS_REFLECT = process.env.CORS_REFLECT_ORIGIN;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  process.env.FRONTEND_ORIGIN = ORIGINAL_FRONTEND_ORIGIN;
  process.env.CORS_REFLECT_ORIGIN = ORIGINAL_CORS_REFLECT;
  vi.resetModules();
});

function setProductionTestEnv() {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'production-test-jwt-secret-not-dev-default';
  process.env.DATA_ENCRYPTION_KEY = 'production-test-data-encryption-key-32';
  process.env.USE_SQLITE_FALLBACK = 'true';
  process.env.DATABASE_PATH = '/tmp/gametime-cors-prod-test.db';
  process.env.CORS_REFLECT_ORIGIN = 'false';
}

describe('production CORS allowlist', () => {
  test('blocks unknown origins when NODE_ENV=production', async () => {
    setProductionTestEnv();
    process.env.FRONTEND_ORIGIN = 'https://gametime-app.org';
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured production frontend origin', async () => {
    setProductionTestEnv();
    process.env.FRONTEND_ORIGIN = 'https://gametime-app.org';
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://gametime-app.org')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://gametime-app.org');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('allows Vercel preview origins when wildcard is configured', async () => {
    setProductionTestEnv();
    process.env.FRONTEND_ORIGIN = 'https://gametime-app.org,https://*.vercel.app';
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://gametime-git-feature-abc.vercel.app')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://gametime-git-feature-abc.vercel.app');
  });
});
