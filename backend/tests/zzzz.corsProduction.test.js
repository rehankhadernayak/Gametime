import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

/**
 * Production CORS must not reflect arbitrary Origins when credentials are enabled.
 * Uses vi.resetModules() so env.js is re-evaluated with NODE_ENV=production.
 *
 * File name is prefixed with zzzz so this suite runs last (singleFork): resetModules()
 * would poison the module cache for every other suite if it ran earlier.
 */
describe('CORS in production', () => {
  let createApp;

  beforeAll(async () => {
    vi.resetModules();
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.DATA_ENCRYPTION_KEY = 'b'.repeat(64);
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/gametime_cors_test';
    process.env.FRONTEND_ORIGIN = 'https://trusted-app.example.com';
    delete process.env.CORS_REFLECT_ORIGIN;

    const mod = await import('../src/app.js');
    createApp = mod.createApp;
  });

  afterAll(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;
  });

  test('blocks credentialed browser preflight from an unknown Origin', async () => {
    const app = createApp();
    const res = await request(app)
      .options('/auth/login')
      .set('Origin', 'https://evil-phishing.example')
      .set('Access-Control-Request-Method', 'POST');

    // When denied, `cors` may fall through to the router; the important signal is
    // no Access-Control-Allow-Origin (browser blocks credentialed reads).
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).not.toBe('true');
  });

  test('allows preflight when Origin is in FRONTEND_ORIGIN allowlist', async () => {
    const app = createApp();
    const origin = 'https://trusted-app.example.com';
    const res = await request(app)
      .options('/auth/login')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('allows GitHub Codespaces preview origins against production API', async () => {
    const app = createApp();
    const origin = 'https://random-port-12345.preview.app.github.dev';
    const res = await request(app)
      .options('/health')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });
});
