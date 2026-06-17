import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

describe('CORS production allowlist', () => {
  let originalNodeEnv;

  beforeEach(async () => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'https://gametime.vercel.app';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.USE_SQLITE_FALLBACK = 'true';
    process.env.DATABASE_PATH = '/tmp/gametime-cors-test.db';
    process.env.JWT_SECRET = 'production-test-jwt-secret-not-dev-default';
    process.env.DATA_ENCRYPTION_KEY = 'production-test-encryption-key-value';
    vi.resetModules();
    await resetTestDb();
    const { initDb } = await import('../src/db/init.js');
    await initDb();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
  });

  test('allows configured production origin with credentials', async () => {
    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://gametime.vercel.app');

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://gametime.vercel.app');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('blocks arbitrary attacker origin in production', async () => {
    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil-attacker.example');

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
