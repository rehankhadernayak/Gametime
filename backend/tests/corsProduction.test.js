import path from 'path';
import os from 'os';
import { afterEach, describe, expect, test, vi } from 'vitest';
import request from 'supertest';
import { setupTestEnv } from './setupTestDb.js';

async function createProductionApp(frontendOrigin = 'https://gametime-app.org') {
  vi.resetModules();
  process.env.NODE_ENV = 'production';
  process.env.CORS_REFLECT_ORIGIN = 'false';
  process.env.FRONTEND_ORIGIN = frontendOrigin;
  process.env.JWT_SECRET = 'cors-production-test-jwt-secret-not-dev-default';
  process.env.DATA_ENCRYPTION_KEY = 'cors-production-test-encryption-key-32chars';
  process.env.USE_SQLITE_FALLBACK = 'true';
  process.env.DATABASE_PATH = path.join(os.tmpdir(), 'gametime-cors-production-test.db');
  const { createApp } = await import('../src/app.js');
  return createApp();
}

describe('production CORS allowlist', () => {
  afterEach(() => {
    setupTestEnv();
    vi.resetModules();
  });

  test('blocks credentialed preflight from arbitrary attacker origin', async () => {
    const app = await createProductionApp();
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows preflight from configured production origin', async () => {
    const app = await createProductionApp();
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://gametime-app.org')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe('https://gametime-app.org');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('allows https preview on vercel.app when wildcard configured', async () => {
    const app = await createProductionApp('https://gametime-app.org,https://*.vercel.app');
    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://gametime-git-feature-abc.vercel.app')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBe(
      'https://gametime-git-feature-abc.vercel.app'
    );
  });
});
