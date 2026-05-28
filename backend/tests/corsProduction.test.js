import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const BASE_ENV = {
  JWT_SECRET: 'test-jwt-secret-for-cors-production-tests',
  DATA_ENCRYPTION_KEY: 'test-data-encryption-key-for-cors',
  USE_SQLITE_FALLBACK: 'true',
  CORS_REFLECT_ORIGIN: 'false'
};

describe('production CORS allowlist', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function appForOriginConfig(overrides) {
    Object.assign(process.env, BASE_ENV, overrides);
    const { createApp } = await import('../src/app.js');
    return createApp();
  }

  test('blocks unknown browser origins', async () => {
    const app = await appForOriginConfig({
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://gametime.example.com',
      DATABASE_PATH: ':memory:'
    });

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured frontend origin', async () => {
    const app = await appForOriginConfig({
      NODE_ENV: 'production',
      FRONTEND_ORIGIN: 'https://gametime.example.com',
      DATABASE_PATH: ':memory:'
    });

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://gametime.example.com');

    expect(res.headers['access-control-allow-origin']).toBe('https://gametime.example.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
