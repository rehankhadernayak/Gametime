import request from 'supertest';
import crypto from 'crypto';
import { afterAll, describe, expect, test, vi } from 'vitest';

const ENV_KEYS = [
  'NODE_ENV',
  'JWT_SECRET',
  'DATA_ENCRYPTION_KEY',
  'DATABASE_URL',
  'FRONTEND_ORIGIN',
  'CORS_REFLECT_ORIGIN'
];

describe('CORS production allowlist', () => {
  afterAll(() => {
    vi.resetModules();
  });

  test('omits Access-Control-Allow-Origin for unknown browser Origin when NODE_ENV is production', async () => {
    const snapshot = {};
    for (const k of ENV_KEYS) snapshot[k] = process.env[k];

    try {
      vi.resetModules();
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
      process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/gametime_cors_test';
      process.env.FRONTEND_ORIGIN = 'https://app.trusted.example';
      delete process.env.CORS_REFLECT_ORIGIN;

      const { createApp } = await import('../src/app.js');
      const app = createApp();
      const res = await request(app)
        .get('/this-route-does-not-exist')
        .set('Origin', 'https://malicious.example');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      for (const k of ENV_KEYS) {
        if (snapshot[k] === undefined) delete process.env[k];
        else process.env[k] = snapshot[k];
      }
      vi.resetModules();
    }
  });
});
