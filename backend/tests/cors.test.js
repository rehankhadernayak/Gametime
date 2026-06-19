import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

const PROD_ENV = {
  NODE_ENV: 'production',
  JWT_SECRET: 'prod-test-jwt-secret-with-enough-entropy',
  DATA_ENCRYPTION_KEY: 'prod-test-data-encryption-key-1234567890',
  FRONTEND_ORIGIN: 'https://gametime.example.com',
  USE_SQLITE_FALLBACK: 'true',
  DATABASE_PATH: '/tmp/gametime-cors-prod-test.db',
  CORS_REFLECT_ORIGIN: 'false'
};

async function loadProdApp() {
  vi.resetModules();
  for (const [key, value] of Object.entries(PROD_ENV)) {
    process.env[key] = value;
  }
  const { createApp } = await import('../src/app.js');
  return createApp();
}

describe('CORS production policy', () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.CORS_REFLECT_ORIGIN;
    process.env.NODE_ENV = 'test';
  });

  test('blocks credentialed preflight from untrusted origins in production', async () => {
    const app = await loadProdApp();

    const blocked = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();

    const allowed = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://gametime.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(allowed.headers['access-control-allow-origin']).toBe('https://gametime.example.com');
  });

  test('allows Codespaces preview origins in production allowlist path', async () => {
    const app = await loadProdApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://myrepo-5173.app.github.dev')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://myrepo-5173.app.github.dev');
  });
});
