import cors from 'cors';
import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { setupTestEnv } from './setupTestDb.js';

setupTestEnv();

describe('CORS production policy', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsReflect = process.env.CORS_REFLECT_ORIGIN;
  const originalFrontendOrigin = process.env.FRONTEND_ORIGIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CORS_REFLECT_ORIGIN = originalCorsReflect;
    process.env.FRONTEND_ORIGIN = originalFrontendOrigin;
    vi.resetModules();
  });

  test('blocks unknown origins in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.FRONTEND_ORIGIN = 'https://app.gametime.app';

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('allows configured frontend origin in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_REFLECT_ORIGIN = 'false';
    process.env.FRONTEND_ORIGIN = 'https://app.gametime.app';

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://app.gametime.app');

    expect(res.headers['access-control-allow-origin']).toBe('https://app.gametime.app');
  });

  test('reflects arbitrary origins in non-production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_ORIGIN = 'https://app.gametime.app';

    const { createApp } = await import('../src/app.js');
    const app = createApp();

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://preview-123.github.dev');

    expect(res.headers['access-control-allow-origin']).toBe('https://preview-123.github.dev');
  });
});
