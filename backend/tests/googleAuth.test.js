import request from 'supertest';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();
process.env.GOOGLE_OAUTH_CLIENT_IDS = 'test-google-client-id.apps.googleusercontent.com';

vi.mock('../src/services/googleVerifyService.js', () => ({
  verifyGoogleIdentity: vi.fn()
}));

const FAKE_ID_TOKEN = 'x'.repeat(24);

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');
const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');

await resetTestDb();
await initDb();
const app = createApp();

describe('Google auth safety', () => {
  beforeAll(async () => {
    await request(app).post('/auth/signup').send({
      name: 'Password Parent',
      email: 'parent-pw@example.com',
      password: 'StrongPass123'
    });
  });

  test('rejects Google sign-in for password-only parent accounts', async () => {
    verifyGoogleIdentity.mockResolvedValueOnce({
      sub: 'google-sub-attacker',
      email: 'parent-pw@example.com',
      name: 'Attacker'
    });

    const res = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: FAKE_ID_TOKEN
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/password login/i);
  });

  test('allows Google sign-up for a new parent email', async () => {
    verifyGoogleIdentity.mockResolvedValueOnce({
      sub: 'google-sub-new',
      email: 'google-new@example.com',
      name: 'Google Parent'
    });

    const res = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signup',
      idToken: FAKE_ID_TOKEN
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.parent.email).toBe('google-new@example.com');
  });
});
