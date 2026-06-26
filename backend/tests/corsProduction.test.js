import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';

const PROD_ENV = {
  NODE_ENV: 'production',
  FRONTEND_ORIGIN: 'https://app.gametime.app',
  CORS_REFLECT_ORIGIN: 'false',
  JWT_SECRET: 'test-production-jwt-secret-not-dev-default',
  DATA_ENCRYPTION_KEY: 'test-production-data-encryption-key-32',
  USE_SQLITE_FALLBACK: 'true',
  DATABASE_PATH: '/tmp/gametime-cors-production-test.db',
  SKIP_MX_VALIDATION: 'true',
  ATHENA_ENABLED: 'false'
};

describe('CORS production allowlist', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function createProductionApp() {
    for (const [key, value] of Object.entries(PROD_ENV)) {
      vi.stubEnv(key, value);
    }
    const { createApp } = await import('../src/app.js');
    return createApp();
  }

  test('blocks untrusted browser origins in production', async () => {
    const app = await createProductionApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured FRONTEND_ORIGIN in production', async () => {
    const app = await createProductionApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://app.gametime.app')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://app.gametime.app');
  });

  test('allows GitHub Codespaces preview origins in production', async () => {
    const app = await createProductionApp();

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://upbeat-space-piano-abc123-5173.app.github.dev')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://upbeat-space-piano-abc123-5173.app.github.dev'
    );
  });
});
