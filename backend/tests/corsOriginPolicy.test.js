import { describe, expect, test, vi } from 'vitest';
import { createCorsOptions } from '../src/utils/corsOriginPolicy.js';

async function corsAllow(opts, origin) {
  if (opts.origin === true) return true;
  return new Promise((resolve, reject) => {
    opts.origin(origin, (err, allowed) => {
      if (err) reject(err);
      else resolve(allowed);
    });
  });
}

describe('createCorsOptions', () => {
  test('production allowlist rejects untrusted Origin', async () => {
    const logger = { warn: vi.fn() };
    const opts = createCorsOptions({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://app.example.com'],
      logger
    });
    await expect(corsAllow(opts, 'https://malicious.example')).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      { origin: 'https://malicious.example' },
      'CORS request blocked for origin'
    );
  });

  test('production allowlist allows configured FRONTEND_ORIGIN', async () => {
    const logger = { warn: vi.fn() };
    const opts = createCorsOptions({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://app.example.com'],
      logger
    });
    await expect(corsAllow(opts, 'https://app.example.com')).resolves.toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  test('production allows https preview on *.vercel.app when wildcard is configured', async () => {
    const logger = { warn: vi.fn() };
    const opts = createCorsOptions({
      nodeEnv: 'production',
      corsReflectOrigin: false,
      frontendOrigins: ['https://*.vercel.app'],
      logger
    });
    await expect(corsAllow(opts, 'https://gametime-git-main-foo.vercel.app')).resolves.toBe(true);
  });

  test('development uses permissive reflect (origin:true)', () => {
    const opts = createCorsOptions({
      nodeEnv: 'development',
      corsReflectOrigin: false,
      frontendOrigins: ['http://localhost:5173'],
      logger: { warn: vi.fn() }
    });
    expect(opts.origin).toBe(true);
  });

  test('production with CORS_REFLECT_ORIGIN mirrors any origin', () => {
    const opts = createCorsOptions({
      nodeEnv: 'production',
      corsReflectOrigin: true,
      frontendOrigins: ['https://app.example.com'],
      logger: { warn: vi.fn() }
    });
    expect(opts.origin).toBe(true);
  });
});
