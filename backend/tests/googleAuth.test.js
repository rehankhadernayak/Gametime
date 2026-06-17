import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();
process.env.GOOGLE_OAUTH_CLIENT_IDS = 'test-google-client-id';

vi.mock('../src/services/googleVerifyService.js', () => ({
  verifyGoogleIdentity: vi.fn()
}));

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');
const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');

beforeEach(async () => {
  await resetTestDb();
  await initDb();
  vi.mocked(verifyGoogleIdentity).mockReset();
});

describe('Google auth account squatting prevention', () => {
  test('rejects parent Google signin when email was registered via password only', async () => {
    const app = createApp();

    await request(app).post('/auth/signup').send({
      name: 'Squat Victim',
      email: 'victim@example.com',
      password: 'AttackerPass123'
    });

    vi.mocked(verifyGoogleIdentity).mockResolvedValue({
      sub: 'google-sub-real-victim',
      email: 'victim@example.com',
      name: 'Real Victim'
    });

    const googleSignin = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: 'fake-google-id-token-for-test'
    });

    expect(googleSignin.statusCode).toBe(403);
    expect(String(googleSignin.body.message || googleSignin.body.error)).toMatch(/password/i);
  });

  test('allows parent Google signin when google_sub is already linked', async () => {
    const app = createApp();
    const db = await (await import('../src/db/connection.js')).getDb();

    await db.run(
      `INSERT INTO parent_accounts (id, name, email, password_hash, google_sub, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'parent-google-1',
        'Google Parent',
        'linked@example.com',
        'hash',
        'google-sub-linked',
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );

    vi.mocked(verifyGoogleIdentity).mockResolvedValue({
      sub: 'google-sub-linked',
      email: 'linked@example.com',
      name: 'Google Parent'
    });

    const googleSignin = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: 'fake-google-id-token-for-test'
    });

    expect(googleSignin.statusCode).toBe(200);
    expect(googleSignin.body.parent.email).toBe('linked@example.com');
  });
});
