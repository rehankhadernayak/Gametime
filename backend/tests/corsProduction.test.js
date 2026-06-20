import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

describe('CORS production allowlist', () => {
  const saved = {};

  beforeAll(() => {
    for (const key of [
      'NODE_ENV',
      'CORS_REFLECT_ORIGIN',
      'FRONTEND_ORIGIN',
      'JWT_SECRET',
      'DATA_ENCRYPTION_KEY',
      'USE_SQLITE_FALLBACK',
      'DATABASE_PATH'
    ]) {
      saved[key] = process.env[key];
    }
    process.env.NODE_ENV = 'production';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.FRONTEND_ORIGIN = 'https://allowed.example.com';
    process.env.JWT_SECRET = 'production-cors-test-jwt-secret-32b';
    process.env.DATA_ENCRYPTION_KEY = 'production-cors-test-enc-key-32b!!';
    process.env.USE_SQLITE_FALLBACK = 'true';
    process.env.DATABASE_PATH = '/tmp/gametime-cors-prod-test.db';
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.resetModules();
  });

  test('allows configured production origin', async () => {
    vi.resetModules();
    const { createApp } = await import('../src/app.js');
    const app = createApp();
    const res = await request(app).get('/health').set('Origin', 'https://allowed.example.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://allowed.example.com');
  });

  test('blocks untrusted cross-site origin', async () => {
    vi.resetModules();
    const { createApp } = await import('../src/app.js');
    const app = createApp();
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
