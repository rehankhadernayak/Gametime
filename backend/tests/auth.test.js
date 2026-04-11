import request from 'supertest';
import { beforeEach, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');

beforeEach(async () => {
  await resetTestDb();
  await initDb();
});

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

async function signupParent(app, overrides = {}) {
  const signup = await request(app).post('/auth/signup').send({
    name: 'Auth Parent',
    email: 'auth@example.com',
    password: 'Password123',
    ...overrides
  });
  expect(signup.statusCode).toBe(201);
  return signup.body.token;
}

describe('Authentication', () => {
  test('parent signup/login/logout flow works and invalidates session', async () => {
    const app = createApp();

    const token = await signupParent(app);

    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.role).toBe('parent');

    const logout = await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logout.statusCode).toBe(200);

    const meAfterLogout = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(meAfterLogout.statusCode).toBe(401);

    const login = await request(app).post('/auth/login').send({
      email: 'auth@example.com',
      password: 'Password123'
    });
    expect(login.statusCode).toBe(200);
  });

  test('child can login directly with optional child credentials', async () => {
    const app = createApp();
    const parentToken = await signupParent(app);

    const childCreate = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Kid',
        dateOfBirth: dobYearsAgo(10),
        email: 'kid@example.com',
        password: 'ChildPass123'
      });
    expect(childCreate.statusCode).toBe(201);

    const childLogin = await request(app).post('/auth/child-login-direct').send({
      email: 'kid@example.com',
      password: 'ChildPass123'
    });
    expect(childLogin.statusCode).toBe(200);
    expect(childLogin.body.child.name).toBe('Kid');
  });

  test('younger child can login with PIN mode, older child cannot use PIN mode', async () => {
    const app = createApp();
    const parentToken = await signupParent(app);

    const younger = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Younger Kid',
        dateOfBirth: dobYearsAgo(7),
        pin: '1234'
      });
    expect(younger.statusCode).toBe(201);

    const youngerPinLogin = await request(app).post('/auth/child-login-pin').send({
      parentEmail: 'auth@example.com',
      childName: 'Younger Kid',
      pin: '1234'
    });
    expect(youngerPinLogin.statusCode).toBe(200);

    const olderCreate = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Older Kid',
        dateOfBirth: dobYearsAgo(13),
        pin: '5678'
      });
    expect(olderCreate.statusCode).toBe(400);
  });

  test('child cannot query another child transactions via childId override', async () => {
    const app = createApp();
    const parentToken = await signupParent(app);

    const childOne = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Child One',
        dateOfBirth: dobYearsAgo(10),
        email: 'childone@example.com',
        password: 'ChildPass123'
      });
    expect(childOne.statusCode).toBe(201);

    const childTwo = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Child Two',
        dateOfBirth: dobYearsAgo(10),
        email: 'childtwo@example.com',
        password: 'ChildPass123'
      });
    expect(childTwo.statusCode).toBe(201);

    const childOneTokenRes = await request(app)
      .post('/auth/child-login')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId: childOne.body.id });
    expect(childOneTokenRes.statusCode).toBe(200);

    const denied = await request(app)
      .get(`/points/transactions?childId=${childTwo.body.id}`)
      .set('Authorization', `Bearer ${childOneTokenRes.body.token}`);
    expect(denied.statusCode).toBe(403);
  });

  test('parent child-login rejects malformed childId', async () => {
    const app = createApp();
    const parentToken = await signupParent(app, { email: 'auth-malformed@example.com' });

    const malformed = await request(app)
      .post('/auth/child-login')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId: 'not-a-uuid' });

    expect(malformed.statusCode).toBe(400);
    expect(malformed.body.error).toBe('Validation failed');
  });
});
