import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

describe('CORS in production', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsReflect = process.env.CORS_REFLECT_ORIGIN;
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_REFLECT_ORIGIN = originalCorsReflect;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    vi.resetModules();
  });

  test('blocks unknown origins when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.FRONTEND_ORIGIN = 'https://gametime.example.com';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DATABASE_PATH = '/tmp/cors-prod-test.db';
    process.env.USE_SQLITE_FALLBACK = 'true';

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'https://gametime.example.com');
    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://gametime.example.com');

    const blocked = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');
    expect(blocked.statusCode).toBe(200);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
