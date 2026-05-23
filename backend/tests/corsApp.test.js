import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

const envSnapshot = { ...process.env };

afterEach(() => {
  vi.resetModules();
  process.env = { ...envSnapshot };
});

describe('CORS (production allowlist)', () => {
  test('does not echo Access-Control-Allow-Origin for disallowed hosts', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.DATA_ENCRYPTION_KEY = 'b'.repeat(64);
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/gametime';
    process.env.FRONTEND_ORIGIN = 'https://trusted.example.com';
    delete process.env.CORS_REFLECT_ORIGIN;
    delete process.env.USE_SQLITE_FALLBACK;

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/auth/login')
      .set('Origin', 'https://malicious.example')
      .set('Access-Control-Request-Method', 'POST');

    // When the origin is denied, `cors` may end the request with 204 or Express may fall through (200).
    expect([200, 204]).toContain(res.status);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('echoes Access-Control-Allow-Origin for FRONTEND_ORIGIN in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.DATA_ENCRYPTION_KEY = 'b'.repeat(64);
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/gametime';
    process.env.FRONTEND_ORIGIN = 'https://trusted.example.com';
    delete process.env.CORS_REFLECT_ORIGIN;
    delete process.env.USE_SQLITE_FALLBACK;

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/auth/login')
      .set('Origin', 'https://trusted.example.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://trusted.example.com');
  });
});
