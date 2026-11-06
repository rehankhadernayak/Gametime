import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const originalEnv = { ...process.env };

describe('CORS production allowlist', () => {
  let createApp;

  beforeEach(async () => {
    vi.resetModules();
    Object.assign(process.env, originalEnv);
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = `prod-test-jwt-${'a'.repeat(40)}`;
    process.env.DATA_ENCRYPTION_KEY = `prod-test-data-${'b'.repeat(40)}`;
    process.env.DATABASE_URL = 'postgres://user:pass@127.0.0.1:5432/gametime_test';
    process.env.FRONTEND_ORIGIN = 'https://trusted.example.com,https://*.vercel.app';
    delete process.env.CORS_REFLECT_ORIGIN;
    delete process.env.USE_SQLITE_FALLBACK;

    ({ createApp } = await import('../src/app.js'));
  });

  afterEach(() => {
    vi.resetModules();
    Object.keys(process.env).forEach((k) => delete process.env[k]);
    Object.assign(process.env, originalEnv);
  });

  test('does not echo Access-Control-Allow-Origin for arbitrary HTTPS origins', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/__cors_probe_missing__')
      .set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured FRONTEND_ORIGIN', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/__cors_probe_missing__')
      .set('Origin', 'https://trusted.example.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://trusted.example.com');
  });

  test('allows https *.vercel.app preview when wildcard is configured', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/__cors_probe_missing__')
      .set('Origin', 'https://gametime-git-main-acme.vercel.app');
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://gametime-git-main-acme.vercel.app'
    );
  });
});
