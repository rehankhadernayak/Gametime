import crypto from 'crypto';
import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');
const { getDb } = await import('../src/db/connection.js');

await resetTestDb();
await initDb();
const app = createApp();

let parentToken;
let parentEmail = 'resetparent@example.com';

beforeAll(async () => {
  const signupRes = await request(app).post('/auth/signup').send({
    name: 'Reset Parent',
    email: parentEmail,
    password: 'Password123'
  });
  expect(signupRes.statusCode).toBe(201);
  parentToken = signupRes.body.token;
});

describe('Password reset flow', () => {
  test('forgot-password returns 200 with safe message for registered email', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: parentEmail });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/reset link has been sent/i);
  });

  test('forgot-password returns 200 with same safe message for unregistered email', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/reset link has been sent/i);
  });

  test('reset-password succeeds with valid token read from DB', async () => {
    // Trigger a fresh reset token
    await request(app).post('/auth/forgot-password').send({ email: parentEmail });

    // Read the token hash from DB, reconstruct raw token from the stored hash
    // The controller stores token_hash = sha256(rawToken), and the rawToken is not stored.
    // Instead, we grab the token_hash and directly update the DB to use a known raw token.
    const db = await getDb();
    const rawToken = 'a'.repeat(64); // 64 hex chars = 32 bytes
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Replace the existing token row with a known token
    const parent = await db.get('SELECT id FROM parent_accounts WHERE email = ?', [parentEmail]);
    await db.run('DELETE FROM password_reset_tokens WHERE parent_id = ?', [parent.id]);
    const { v4: uuidv4 } = await import('uuid');
    await db.run(
      'INSERT INTO password_reset_tokens (id, parent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), parent.id, tokenHash, expiresAt]
    );

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'NewPassword456' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/password updated/i);
  });

  test('reset-password succeeds and allows login with new password', async () => {
    // Trigger reset
    await request(app).post('/auth/forgot-password').send({ email: parentEmail });

    const db = await getDb();
    const rawToken = 'b'.repeat(64);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const parent = await db.get('SELECT id FROM parent_accounts WHERE email = ?', [parentEmail]);
    await db.run('DELETE FROM password_reset_tokens WHERE parent_id = ?', [parent.id]);
    const { v4: uuidv4 } = await import('uuid');
    await db.run(
      'INSERT INTO password_reset_tokens (id, parent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), parent.id, tokenHash, expiresAt]
    );

    await request(app)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'AnotherPass789' });

    const loginRes = await request(app).post('/auth/login').send({
      email: parentEmail,
      password: 'AnotherPass789'
    });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
  });

  test('reset-password with invalid token returns 400', async () => {
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'invalidtoken000000000000000000000000000000000000000000000000000000', password: 'NewPassword456' });

    expect(res.statusCode).toBe(400);
  });

  test('reset-password with already-used token returns 400', async () => {
    const db = await getDb();
    const rawToken = 'c'.repeat(64);
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const parent = await db.get('SELECT id FROM parent_accounts WHERE email = ?', [parentEmail]);
    await db.run('DELETE FROM password_reset_tokens WHERE parent_id = ?', [parent.id]);
    const { v4: uuidv4 } = await import('uuid');
    await db.run(
      'INSERT INTO password_reset_tokens (id, parent_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), parent.id, tokenHash, expiresAt]
    );

    // Use the token once
    await request(app)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'FirstUse111' });

    // Try again with the same token
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: rawToken, password: 'SecondUse222' });

    expect(res.statusCode).toBe(400);
  });
});
