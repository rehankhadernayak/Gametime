import fs from 'fs';
import os from 'os';
import path from 'path';

let cachedTestDbPath = '';

function getTestDbPath() {
  if (cachedTestDbPath) return cachedTestDbPath;
  const workerId = process.env.VITEST_WORKER_ID || process.env.VITEST_POOL_ID || process.pid;
  cachedTestDbPath = path.join(os.tmpdir(), `gametime-test-${workerId}.db`);
  return cachedTestDbPath;
}

export function setupTestEnv() {
  process.env.DATABASE_PATH = getTestDbPath();
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '2h';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173,http://localhost:8081';
  process.env.NODE_ENV = 'test';
  process.env.SKIP_MX_VALIDATION = 'true';
  process.env.DATA_ENCRYPTION_KEY = 'test-data-encryption-key-1234567890';
  process.env.ATHENA_ENABLED = 'false';
  process.env.ATHENA_MOCK_MODE = 'true';
  process.env.ATHENA_API_VERSION = 'v2';
  process.env.ATHENA_GIFTCODE_SECRET = 'test-athena-giftcode-secret';
  process.env.ATHENA_WEBHOOK_SECRET = 'test-athena-webhook-secret';
}

export async function resetTestDb() {
  const { closeDb } = await import('../src/db/connection.js');
  await closeDb();
  const dbPath = process.env.DATABASE_PATH || getTestDbPath();
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) fs.rmSync(target, { force: true });
  }
}
