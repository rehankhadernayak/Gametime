import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { setupTestEnv } from './setupTestDb.js';

setupTestEnv();

describe('CORS policy', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;
  const originalCorsReflect = process.env.CORS_REFLECT_ORIGIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    process.env.CORS_REFLECT_ORIGIN = originalCorsReflect;
    vi.resetModules();
  });

  test('production blocks arbitrary cross-origin credentialed requests', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'https://app.gametime.example';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.USE_SQLITE_FALLBACK = 'true';
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'https://app.gametime.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.gametime.example');

    const blocked = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('production allows GitHub Codespaces preview origins', async () => {
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'https://app.gametime.example';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.USE_SQLITE_FALLBACK = 'true';
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .options('/auth/me')
      .set('Origin', 'https://foo-5173.app.github.dev')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://foo-5173.app.github.dev');
  });

  test('development reflects any origin for local tooling', async () => {
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    vi.resetModules();

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:9999');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:9999');
  });
});
