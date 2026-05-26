import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { afterAll, describe, expect, test, vi } from 'vitest';

function restoreProcessEnv(snapshot) {
  for (const key of Object.keys(process.env)) {
    if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/**
 * Ensures production does not reflect arbitrary Origins (regression for #169).
 * Dynamic import after env mutation so `env.js` reads production settings.
 */
describe('CORS production allowlist', () => {
  const prevEnv = { ...process.env };

  afterAll(() => {
    restoreProcessEnv(prevEnv);
    vi.resetModules();
  });

  test('preflight from a non-allowlisted Origin does not receive Access-Control-Allow-Origin', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `gametime-cors-prod-${crypto.randomBytes(8).toString('hex')}.db`
    );

    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
      process.env.DATA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      process.env.USE_SQLITE_FALLBACK = 'true';
      process.env.DATABASE_PATH = dbPath;
      process.env.FRONTEND_ORIGIN = 'https://app.trusted.example';
      delete process.env.CORS_REFLECT_ORIGIN;
      process.env.SKIP_MX_VALIDATION = 'true';

      vi.resetModules();
      const { initDb } = await import('../src/db/init.js');
      const { createApp } = await import('../src/app.js');
      await initDb();
      const app = createApp();

      const blocked = await request(app)
        .options('/auth/login')
        .set('Origin', 'https://evil.attacker.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(blocked.headers['access-control-allow-origin']).toBeUndefined();

      const allowed = await request(app)
        .options('/auth/login')
        .set('Origin', 'https://app.trusted.example')
        .set('Access-Control-Request-Method', 'POST');

      expect(allowed.headers['access-control-allow-origin']).toBe('https://app.trusted.example');

      const { closeDb } = await import('../src/db/connection.js');
      await closeDb();
    } finally {
      try {
        const { closeDb } = await import('../src/db/connection.js');
        await closeDb();
      } catch {
        // ignore
      }
      for (const suffix of ['', '-wal', '-shm']) {
        const f = `${dbPath}${suffix}`;
        if (fs.existsSync(f)) fs.rmSync(f, { force: true });
      }
      restoreProcessEnv(prevEnv);
      vi.resetModules();
    }
  });
});
