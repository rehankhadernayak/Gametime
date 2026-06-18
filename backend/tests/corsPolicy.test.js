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

async function loadAppWithEnv({ nodeEnv, frontendOrigin, corsReflectOrigin }) {
  process.env.NODE_ENV = nodeEnv;
  process.env.FRONTEND_ORIGIN = frontendOrigin;
  process.env.CORS_REFLECT_ORIGIN = corsReflectOrigin ?? '';
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATA_ENCRYPTION_KEY = 'test-data-encryption-key-1234567890';
  if (nodeEnv === 'production') {
    process.env.USE_SQLITE_FALLBACK = 'true';
    process.env.DATABASE_PATH = process.env.DATABASE_PATH || '/tmp/gametime-cors-test.db';
  }
  vi.resetModules();
  const { createApp } = await import('../src/app.js');
  return createApp();
}

describe('CORS policy', () => {
  test('production blocks unknown origins', async () => {
    const app = await loadAppWithEnv({
      nodeEnv: 'production',
      frontendOrigin: 'https://gametime.example.com'
    });

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('production allows configured frontend origins', async () => {
    const app = await loadAppWithEnv({
      nodeEnv: 'production',
      frontendOrigin: 'https://gametime.example.com'
    });

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://gametime.example.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://gametime.example.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('production allows GitHub Codespaces preview origins', async () => {
    const app = await loadAppWithEnv({
      nodeEnv: 'production',
      frontendOrigin: 'https://gametime.example.com'
    });

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://fancy-name-12345.app.github.dev')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://fancy-name-12345.app.github.dev');
  });

  test('non-production reflects arbitrary dev origins', async () => {
    const app = await loadAppWithEnv({
      nodeEnv: 'development',
      frontendOrigin: 'http://localhost:5173'
    });

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://fancy-name-12345.app.github.dev')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://fancy-name-12345.app.github.dev');
  });
});
