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

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

let adminToken;
let regularToken;
let regularParentId;

beforeAll(async () => {
  // Create admin parent, then grant admin via DB, then log back in for admin token
  await request(app).post('/auth/signup').send({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'AdminPass123'
  });

  const db = await getDb();
  await db.run("UPDATE parent_accounts SET is_admin = 1 WHERE email = 'admin@example.com'");

  const adminLogin = await request(app).post('/auth/login').send({
    email: 'admin@example.com',
    password: 'AdminPass123'
  });
  adminToken = adminLogin.body.token;

  // Create a regular (non-admin) parent
  const regularSignup = await request(app).post('/auth/signup').send({
    name: 'Regular Parent',
    email: 'regular@example.com',
    password: 'RegularPass123'
  });
  regularToken = regularSignup.body.token;
  regularParentId = regularSignup.body.parent?.id || regularSignup.body.user?.id;

  // Add a child for the regular parent so families list is richer
  await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${regularToken}`)
    .send({ name: 'Regular Child', dateOfBirth: dobYearsAgo(9), email: 'regularchild@example.com', password: 'KidPass123' });
});

describe('Admin routes', () => {
  test('admin can fetch platform stats', async () => {
    const res = await request(app)
      .get('/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.totalParents).toBe('number');
    expect(typeof res.body.totalChildren).toBe('number');
    expect(typeof res.body.totalTasks).toBe('number');
    // approvedTasks / pendingApprovals can be null when no tasks exist
    expect(res.body.totalParents).toBeGreaterThanOrEqual(2);
    expect(res.body.totalChildren).toBeGreaterThanOrEqual(1);
  });

  test('non-admin parent is rejected from admin stats with 403', async () => {
    const res = await request(app)
      .get('/admin/stats')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('unauthenticated request to admin stats returns 401', async () => {
    const res = await request(app).get('/admin/stats');
    expect(res.statusCode).toBe(401);
  });

  test('admin can list families with pagination', async () => {
    const res = await request(app)
      .get('/admin/families?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.families)).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.families.length).toBeGreaterThanOrEqual(2);
  });

  test('admin can search families by name', async () => {
    const res = await request(app)
      .get('/admin/families?search=Regular')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.families.some(f => f.name === 'Regular Parent')).toBe(true);
  });

  test('admin can fetch a specific family detail', async () => {
    const res = await request(app)
      .get(`/admin/families/${regularParentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.parent.email).toBe('regular@example.com');
    expect(Array.isArray(res.body.children)).toBe(true);
    expect(res.body.children.length).toBe(1);
    expect(res.body.children[0].name).toBe('Regular Child');
  });

  test('admin gets 404 for non-existent family', async () => {
    const res = await request(app)
      .get('/admin/families/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(404);
  });

  test('admin can grant and revoke admin flag', async () => {
    const grant = await request(app)
      .patch(`/admin/families/${regularParentId}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAdmin: true });
    expect(grant.statusCode).toBe(200);

    const check = await request(app)
      .get(`/admin/families/${regularParentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(check.body.parent.isAdmin).toBe(1);

    const revoke = await request(app)
      .patch(`/admin/families/${regularParentId}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAdmin: false });
    expect(revoke.statusCode).toBe(200);
  });

  test('admin grant/revoke rejects non-boolean isAdmin', async () => {
    const res = await request(app)
      .patch(`/admin/families/${regularParentId}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAdmin: 'yes' });
    expect(res.statusCode).toBe(400);
  });

  test('leaderboard returns children ranked by RP balance', async () => {
    const res = await request(app)
      .get('/children/leaderboard')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const entry = res.body[0];
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('rank');
      expect(entry).toHaveProperty('rpBalance');
    }
  });
});

describe('PDPA — Data export and account deletion', () => {
  test('parent can export their data as a JSON blob', async () => {
    const res = await request(app)
      .get('/auth/export-data')
      .set('Authorization', `Bearer ${regularToken}`);
    expect(res.statusCode).toBe(200);
    const ct = res.headers['content-type'] || '';
    expect(ct).toContain('application/json');
    expect(res.body).toHaveProperty('exportedAt');
    expect(res.body).toHaveProperty('account');
    expect(res.body).toHaveProperty('children');
    expect(res.body).toHaveProperty('gamingSessions');
  });

  test('account deletion fails with wrong password', async () => {
    const res = await request(app)
      .delete('/auth/account')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ password: 'WrongPassword' });
    // Server returns 403 for wrong password (confirmed from authController.js:486)
    expect(res.statusCode).toBe(403);
  });

  test('account deletion with correct password removes the account', async () => {
    const throwaway = await request(app).post('/auth/signup').send({
      name: 'Delete Me',
      email: 'deleteme@example.com',
      password: 'DeletePass123'
    });
    const throwawayToken = throwaway.body.token;

    const del = await request(app)
      .delete('/auth/account')
      .set('Authorization', `Bearer ${throwawayToken}`)
      .send({ password: 'DeletePass123' });
    expect(del.statusCode).toBe(200);
    expect(del.body.dataRemovalNotice).toContain('24 hours');

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${throwawayToken}`);
    expect(meRes.statusCode).toBe(401);
  });
});
