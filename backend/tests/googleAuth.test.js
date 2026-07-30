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

describe('Google auth account squatting', () => {
  test('rejects Google sign-in when email matches a password-only account', async () => {
    const app = createApp();

    const signup = await request(app).post('/auth/signup').send({
      name: 'Squatter',
      email: 'victim@example.com',
      password: 'StrongPass123'
    });
    expect(signup.statusCode).toBe(201);

    vi.mocked(verifyGoogleIdentity).mockResolvedValue({
      sub: 'google-sub-victim',
      email: 'victim@example.com',
      name: 'Real Victim'
    });

    const googleSignin = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: 'fake-id-token-with-min-length'
    });

    expect(googleSignin.statusCode).toBe(403);
    expect(String(googleSignin.body.error || '')).toMatch(/password/i);
  });

  test('allows Google sign-in when account is linked by google_sub', async () => {
    const app = createApp();
    const { getDb } = await import('../src/db/connection.js');
    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO parent_accounts (id, name, email, password_hash, google_sub, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['parent-1', 'Linked Parent', 'linked@example.com', 'hash', 'google-sub-linked', now, now]
    );

    vi.mocked(verifyGoogleIdentity).mockResolvedValue({
      sub: 'google-sub-linked',
      email: 'linked@example.com',
      name: 'Linked Parent'
    });

    const googleSignin = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: 'fake-id-token-with-min-length'
    });

    expect(googleSignin.statusCode).toBe(200);
    expect(googleSignin.body.parent.email).toBe('linked@example.com');
  });

  test('rejects Google sign-in when child email matches a password-only profile', async () => {
    const app = createApp();
    const { getDb } = await import('../src/db/connection.js');
    const db = await getDb();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO parent_accounts (id, name, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['parent-1', 'Parent', 'parent@example.com', 'hash', now, now]
    );
    await db.run(
      `INSERT INTO child_profiles (id, parent_id, name, email, password_hash, date_of_birth, points_balance, giftcard_points_balance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      ['child-1', 'parent-1', 'Victim Kid', 'victim-kid@example.com', 'hash', '2015-01-01', now, now]
    );

    vi.mocked(verifyGoogleIdentity).mockResolvedValue({
      sub: 'google-sub-child-victim',
      email: 'victim-kid@example.com',
      name: 'Attacker'
    });

    const googleSignin = await request(app).post('/auth/google').send({
      role: 'child',
      idToken: 'fake-id-token-with-min-length'
    });

    expect(googleSignin.statusCode).toBe(403);
    expect(String(googleSignin.body.error || '')).toMatch(/password|PIN/i);
  });
});
