import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');

await resetTestDb();
await initDb();
const app = createApp();

let parentToken;
let childId;

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

beforeAll(async () => {
  const signupRes = await request(app).post('/auth/signup').send({
    name: 'List Parent',
    email: 'listparent@example.com',
    password: 'Password123'
  });
  expect(signupRes.statusCode).toBe(201);
  parentToken = signupRes.body.token;

  const childRes = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      name: 'List Child',
      dateOfBirth: dobYearsAgo(10),
      email: 'listchild@example.com',
      password: 'ChildPass123'
    });
  expect(childRes.statusCode).toBe(201);
  childId = childRes.body.id;
});

describe('Children list', () => {
  test('GET /children/list returns array for parent', async () => {
    const res = await request(app)
      .get('/children/list')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /children/list returns correct child fields', async () => {
    const res = await request(app)
      .get('/children/list')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.statusCode).toBe(200);
    const child = res.body.find((c) => c.id === childId);
    expect(child).toBeTruthy();
    expect(child.name).toBe('List Child');
    expect(child.email).toBe('listchild@example.com');
    expect(typeof child.pointsBalance).toBe('number');
    expect(typeof child.giftcardPointsBalance).toBe('number');
    expect(child.hasPasswordLogin).toBe(true);
    expect(child.hasPinLogin).toBe(false);
    expect(child.hasScreenTimeSelection).toBe(false);
  });

  test('GET /children/list requires auth', async () => {
    const res = await request(app).get('/children/list');
    expect(res.statusCode).toBe(401);
  });
});

describe('Children avatar', () => {
  const avatarData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAFCAABAAEEASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwAB/9k=';
  const avatarMime = 'image/jpeg';

  test('POST /children/:id/avatar uploads avatar and returns avatarUrl', async () => {
    const res = await request(app)
      .post(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ avatarData, avatarMime });

    expect(res.statusCode).toBe(200);
    expect(res.body.avatarUrl).toBeTruthy();
    expect(typeof res.body.avatarUrl).toBe('string');
  });

  test('POST /children/:id/avatar requires parent auth', async () => {
    const res = await request(app)
      .post(`/children/${childId}/avatar`)
      .send({ avatarData, avatarMime });

    expect(res.statusCode).toBe(401);
  });

  test('POST /children/:id/avatar rejects missing fields', async () => {
    const res = await request(app)
      .post(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ avatarMime });

    expect(res.statusCode).toBe(400);
  });

  test('POST /children/:id/avatar rejects non-image mime', async () => {
    const res = await request(app)
      .post(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ avatarData, avatarMime: 'application/pdf' });

    expect(res.statusCode).toBe(400);
  });

  test('GET /children/:id/avatar returns image after upload', async () => {
    // Upload first
    await request(app)
      .post(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ avatarData, avatarMime });

    const res = await request(app)
      .get(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });

  test('GET /children/:id/avatar returns 404 when no avatar exists for unknown child', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const fakeId = uuidv4();
    const res = await request(app)
      .get(`/children/${fakeId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.statusCode).toBe(404);
  });

  test('child can access their own avatar', async () => {
    // Upload avatar
    await request(app)
      .post(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ avatarData, avatarMime });

    // Get child token
    const childLoginRes = await request(app)
      .post('/auth/child-login')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId });
    expect(childLoginRes.statusCode).toBe(200);
    const childToken = childLoginRes.body.token;

    const res = await request(app)
      .get(`/children/${childId}/avatar`)
      .set('Authorization', `Bearer ${childToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });
});

describe('Children screen time selection', () => {
  test('PATCH /children/:id/screen-time-selection saves payload', async () => {
    const encoded = '{"opaqueFamilyActivitySelection":true}';
    const res = await request(app)
      .patch(`/children/${childId}/screen-time-selection`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ encodedSelectionJson: encoded });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /children/screen-time-selection returns payload for child session', async () => {
    const encoded = '{"blocks":["token-a"]}';
    await request(app)
      .patch(`/children/${childId}/screen-time-selection`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ encodedSelectionJson: encoded });

    const childLoginRes = await request(app)
      .post('/auth/child-login')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId });
    expect(childLoginRes.statusCode).toBe(200);
    const childToken = childLoginRes.body.token;

    const res = await request(app)
      .get('/children/screen-time-selection')
      .set('Authorization', `Bearer ${childToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.encodedSelectionJson).toBe(encoded);
  });

  test('GET /children/screen-time-selection rejects parent token', async () => {
    const res = await request(app)
      .get('/children/screen-time-selection')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('PATCH /children/:id/screen-time-selection rejects other household', async () => {
    const signupRes = await request(app).post('/auth/signup').send({
      name: 'Other Parent',
      email: 'otherparent-screen@example.com',
      password: 'Password123'
    });
    expect(signupRes.statusCode).toBe(201);
    const otherToken = signupRes.body.token;

    const res = await request(app)
      .patch(`/children/${childId}/screen-time-selection`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ encodedSelectionJson: '{}' });

    expect(res.statusCode).toBe(404);
  });
});
