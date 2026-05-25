import { describe, expect, test, vi } from 'vitest';
import { buildCorsOriginConfig, normalizeOrigin } from '../src/middleware/corsPolicy.js';

function mockLogger() {
  return { warn: vi.fn() };
}

describe('normalizeOrigin', () => {
  test('trims and strips trailing slash', () => {
    expect(normalizeOrigin('  https://app.example/  ')).toBe('https://app.example');
  });
});

describe('buildCorsOriginConfig', () => {
  test('reflect mode when not production', () => {
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'test',
      corsReflectOrigin: false,
      frontendOrigins: ['http://localhost:5173'],
      logger: mockLogger()
    });
    expect(cfg.mode).toBe('reflect');
  });

  test('reflect mode in production when CORS_REFLECT_ORIGIN is enabled', () => {
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'production',
      corsReflectOrigin: true,
      frontendOrigins: ['https://app.example.com'],
      logger: mockLogger()
    });
    expect(cfg.mode).toBe('reflect');
  });

  test('production allowlist denies unknown HTTPS origin', () => {
    const logger = mockLogger();
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://trusted.example.com'],
      logger
    });
    expect(cfg.mode).toBe('allowlist');

    let allowed;
    cfg.origin('https://malicious.example', (err, ok) => {
      expect(err).toBeNull();
      allowed = ok;
    });
    expect(allowed).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });

  test('production allowlist allows FRONTEND_ORIGIN entry', () => {
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://trusted.example.com'],
      logger: mockLogger()
    });

    let allowed;
    cfg.origin('https://trusted.example.com', (err, ok) => {
      expect(err).toBeNull();
      allowed = ok;
    });
    expect(allowed).toBe(true);
  });

  test('production allowlist allows GitHub Codespaces-style origin', () => {
    const logger = mockLogger();
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://app.example.com'],
      logger
    });

    let allowed;
    cfg.origin('https://random-name-12345.github.dev', (err, ok) => {
      expect(err).toBeNull();
      allowed = ok;
    });
    expect(allowed).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('production allowlist allows https *.vercel.app when wildcard configured', () => {
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://*.vercel.app'],
      logger: mockLogger()
    });

    let allowed;
    cfg.origin('https://my-app-git-main-foo.vercel.app', (err, ok) => {
      expect(err).toBeNull();
      allowed = ok;
    });
    expect(allowed).toBe(true);
  });

  test('no-origin (same-site / curl) is allowed in allowlist mode', () => {
    const cfg = buildCorsOriginConfig({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://trusted.example.com'],
      logger: mockLogger()
    });

    let allowed;
    cfg.origin(undefined, (err, ok) => {
      expect(err).toBeNull();
      allowed = ok;
    });
    expect(allowed).toBe(true);
  });
});
