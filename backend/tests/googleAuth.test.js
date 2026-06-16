import request from 'supertest';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

vi.mock('../src/services/googleVerifyService.js', () => ({
  verifyGoogleIdentity: vi.fn()
}));

setupTestEnv();

const { verifyGoogleIdentity } = await import('../src/services/googleVerifyService.js');
const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');

beforeEach(async () => {
  vi.mocked(verifyGoogleIdentity).mockReset();
  await resetTestDb();
  await initDb();
});

describe('Google auth', () => {
  test('signin rejects password-only account matched by email (email squatting)', async () => {
    const app = createApp();

    const signup = await request(app).post('/auth/signup').send({
      name: 'Squatter',
      email: 'victim@gmail.com',
      password: 'Password123'
    });
    expect(signup.statusCode).toBe(201);

    verifyGoogleIdentity.mockResolvedValue({
      sub: 'google-sub-real-victim',
      email: 'victim@gmail.com',
      name: 'Real Victim'
    });

    const signin = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: 'fake-google-id-token-ok'
    });

    expect(signin.statusCode).toBe(403);
    expect(signin.body.error).toMatch(/password/i);
  });

  test('signin succeeds when google_sub already linked', async () => {
    const app = createApp();

    verifyGoogleIdentity.mockResolvedValue({
      sub: 'google-sub-linked',
      email: 'linked@gmail.com',
      name: 'Linked Parent'
    });

    const signup = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signup',
      idToken: 'fake-google-id-token-ok'
    });
    expect(signup.statusCode).toBe(201);

    const signin = await request(app).post('/auth/google').send({
      role: 'parent',
      intent: 'signin',
      idToken: 'fake-google-id-token-ok'
    });
    expect(signin.statusCode).toBe(200);
    expect(signin.body.parent.email).toBe('linked@gmail.com');
  });
});
