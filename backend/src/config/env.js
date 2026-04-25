import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

/* Resolve .env relative to THIS file (src/config/env.js → ../../.env = backend/.env)
   so the path is correct regardless of where `npm run dev` is called from. */
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = process.env.ENV_FILE || resolve(__dirname, '../../.env');

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: envPath, override: true });
}

const frontendOriginRaw = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const frontendOrigins = frontendOriginRaw
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function parseTrustProxy(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'false') return false;
  if (raw === 'true') return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

/* ── Security-critical defaults ─────────────────────────────────────────
   In production these MUST be overridden via real environment variables.
   The app will refuse to start (throw) if it detects dev placeholder values
   while NODE_ENV=production.  In development a loud warning is printed.
   ────────────────────────────────────────────────────────────────────── */
const DEV_JWT_SECRET = 'dev-secret-change-me';
const DEV_ENC_KEY    = 'dev-data-key-change-me';

const rawJwtSecret = process.env.JWT_SECRET || DEV_JWT_SECRET;
const rawEncKey    = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || DEV_ENC_KEY;

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET) {
    throw new Error('[FATAL] JWT_SECRET must be set to a strong secret in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  if (!process.env.DATA_ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY === DEV_ENC_KEY) {
    throw new Error('[FATAL] DATA_ENCRYPTION_KEY must be set in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  if (!process.env.DATABASE_PATH) {
    throw new Error('[FATAL] DATABASE_PATH must be set to an absolute path in production (e.g. /data/gametime.db). The default relative path is unsafe in containerised deployments.');
  }
} else {
  if (rawJwtSecret === DEV_JWT_SECRET) {
    process.stderr.write('\x1b[33m[SECURITY WARNING]\x1b[0m JWT_SECRET is using the dev default. Set a strong secret before deploying to production.\n');
  }
  if (rawEncKey === DEV_ENC_KEY) {
    process.stderr.write('\x1b[33m[SECURITY WARNING]\x1b[0m DATA_ENCRYPTION_KEY is using the dev default. Set a strong key before deploying to production.\n');
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  backendRoot: resolve(__dirname, '../..'),
  jwtSecret: rawJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  databasePath: process.env.DATABASE_PATH || './data/gametime.db',
  frontendOrigins,
  dataEncryptionKey: rawEncKey,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 0),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'Gametime <no-reply@gametime.local>',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailCheckMode: (process.env.EMAIL_CHECK_MODE || 'smtp').toLowerCase(),
  emailAllowUnknownSmtp: process.env.EMAIL_ALLOW_UNKNOWN_SMTP === 'true',
  emailSmtpProbeTimeoutMs: Number(process.env.EMAIL_SMTP_PROBE_TIMEOUT_MS || 5000),
  emailSmtpProbeMaxHosts: Number(process.env.EMAIL_SMTP_PROBE_MAX_HOSTS || 3),
  emailProbeFrom: process.env.EMAIL_PROBE_FROM || 'verify@gametime.local',
  emailHeloDomain: process.env.EMAIL_HELO_DOMAIN || 'gametime.local',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  skipMxValidation: process.env.SKIP_MX_VALIDATION === 'true',
  athenaEnabled: process.env.ATHENA_ENABLED === 'true',
  athenaMockMode: process.env.ATHENA_MOCK_MODE === 'true',
  athenaBaseUrl: process.env.ATHENA_BASE_URL || 'https://api-sandbox.athenagaming.gg',
  athenaApiVersion: process.env.ATHENA_API_VERSION || 'v2',
  athenaApiKey: process.env.ATHENA_API_KEY || '',
  athenaPartnerId: process.env.ATHENA_PARTNER_ID || '',
  athenaGiftcodeSecret: process.env.ATHENA_GIFTCODE_SECRET || '',
  athenaWebhookSecret: process.env.ATHENA_WEBHOOK_SECRET || '',
  athenaTimeoutMs: Number(process.env.ATHENA_TIMEOUT_MS || 15000),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};
