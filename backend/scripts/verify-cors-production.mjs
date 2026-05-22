/**
 * Isolated check: in NODE_ENV=production with CORS_REFLECT unset, untrusted browser
 * Origins must not receive Access-Control-Allow-Credentials + reflected ACAO.
 * Run after unit tests: `node scripts/verify-cors-production.mjs`
 */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import request from 'supertest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '..');

process.chdir(backendRoot);
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'verify-cors-production-jwt-secret-min-32-chars';
process.env.DATA_ENCRYPTION_KEY = 'verify-cors-production-enc-key-min-32-chars';
process.env.USE_SQLITE_FALLBACK = 'true';
process.env.DATABASE_PATH = resolve(backendRoot, 'data', 'gametime.db');
process.env.FRONTEND_ORIGIN = 'https://app.trusted-cors-test.example';
process.env.CORS_REFLECT_ORIGIN = 'false';

const { createApp } = await import('../src/app.js');
const app = createApp();

const evilOrigin = 'https://evil-cors-test.example';

const preflight = await request(app)
  .options('/health')
  .set('Origin', evilOrigin)
  .set('Access-Control-Request-Method', 'GET');

const acao = preflight.headers['access-control-allow-origin'];
if (acao === evilOrigin) {
  console.error(
    'FATAL: CORS reflects an arbitrary Origin in production — credentialed browser API theft is possible.'
  );
  process.exit(1);
}

const trusted = await request(app)
  .options('/health')
  .set('Origin', 'https://app.trusted-cors-test.example')
  .set('Access-Control-Request-Method', 'GET');

const trustedAco = trusted.headers['access-control-allow-origin'];
if (trustedAco !== 'https://app.trusted-cors-test.example') {
  console.error('Expected trusted FRONTEND_ORIGIN to be allowed, got:', trustedAco);
  process.exit(1);
}

console.log('CORS production allowlist check passed.');
