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

async function bootstrap() {
  const app = createApp();
  const signup = await request(app).post('/auth/signup').send({
    name: 'Gaming Parent',
    email: 'gaming-parent@example.com',
    password: 'StrongPass123'
  });
  const parentToken = signup.body.token;

  const child = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      name: 'Gamer Kid',
      dateOfBirth: dobYearsAgo(10),
      email: 'gamer-kid@example.com',
      password: 'KidPass123'
    });

  const childTokenRes = await request(app)
    .post('/auth/child-login')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId: child.body.id });

  return {
    app,
    parentToken,
    childToken: childTokenRes.body.token,
    childId: child.body.id
  };
}

describe('Gaming controls', () => {
  test('blocked game denies session start', async () => {
    const { app, parentToken, childToken } = await bootstrap();

    const createGame = await request(app)
      .post('/gaming/games')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Roblox', platform: 'iOS', status: 'Blocked' });

    expect(createGame.statusCode).toBe(201);

    const start = await request(app)
      .post('/gaming/sessions/start')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ gameName: 'Roblox', platform: 'iOS', requestedMinutes: 30 });

    expect(start.statusCode).toBe(200);
    expect(start.body.allowed).toBe(false);
    expect(start.body.code).toBe('BLOCKED_GAME');
    expect(start.body.reason).toContain('Blocked');
  });

  test('allowed game session records usage and appears in weekly report', async () => {
    const { app, parentToken, childToken, childId } = await bootstrap();

    await request(app)
      .post('/points/adjust')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, points: 100, note: 'Gaming budget' });

    await request(app)
      .post('/gaming/games')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Minecraft', platform: 'Windows', status: 'Allowed' });

    const start = await request(app)
      .post('/gaming/sessions/start')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ gameName: 'Minecraft', platform: 'Windows', requestedMinutes: 45 });

    expect(start.statusCode).toBe(200);
    expect(start.body.allowed).toBe(true);

    const end = await request(app)
      .post('/gaming/sessions/end')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessionId: start.body.sessionId, actualMinutes: 30 });

    expect(end.statusCode).toBe(200);
    expect(end.body.ignored).toBe(false);

    const report = await request(app)
      .get(`/gaming/reports/weekly?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(report.statusCode).toBe(200);
    expect(report.body.totals.totalMinutes).toBeGreaterThanOrEqual(30);
    expect(report.body.byGame.some((item) => item.gameName === 'Minecraft')).toBe(true);
  });

  test('child cannot switch target child by sending childId override', async () => {
    const { app, parentToken, childToken, childId } = await bootstrap();

    const otherChild = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Sibling',
        dateOfBirth: dobYearsAgo(8),
        email: 'sibling@example.com',
        password: 'Sibling123'
      });
    expect(otherChild.statusCode).toBe(201);

    await request(app)
      .post('/points/adjust')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, points: 100, note: 'Gaming budget' });

    await request(app)
      .post('/gaming/games')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Fortnite', platform: 'Windows', status: 'Allowed' });

    const start = await request(app)
      .post('/gaming/sessions/start')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        childId: otherChild.body.id,
        gameName: 'Fortnite',
        platform: 'Windows',
        requestedMinutes: 20
      });

    expect(start.statusCode).toBe(200);
    expect(start.body.allowed).toBe(true);

    const ownSessions = await request(app)
      .get('/gaming/sessions')
      .set('Authorization', `Bearer ${childToken}`);
    expect(ownSessions.statusCode).toBe(200);
    expect(ownSessions.body.some((session) => session.gameName === 'Fortnite')).toBe(true);

    const siblingReport = await request(app)
      .get(`/gaming/reports/weekly?childId=${otherChild.body.id}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(siblingReport.statusCode).toBe(200);
    expect(siblingReport.body.totals.totalMinutes).toBe(0);
  });

  test('parent gaming audit includes denial and child context', async () => {
    const { app, parentToken, childToken } = await bootstrap();

    await request(app)
      .post('/gaming/games')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'PUBG', platform: 'iOS', status: 'Blocked' });

    await request(app)
      .post('/gaming/sessions/start')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ gameName: 'PUBG', platform: 'iOS', requestedMinutes: 25 });

    const audit = await request(app)
      .get('/gaming/sessions/audit?limit=20')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(audit.statusCode).toBe(200);
    expect(Array.isArray(audit.body)).toBe(true);
    expect(audit.body.length).toBeGreaterThan(0);
    expect(audit.body.some((entry) => entry.status === 'Denied' && entry.denialCode === 'BLOCKED_GAME')).toBe(true);
    expect(audit.body.some((entry) => entry.childName === 'Gamer Kid')).toBe(true);
  });

  test('concurrent start requests keep only one Started session', async () => {
    const { app, parentToken, childToken, childId } = await bootstrap();

    await request(app)
      .post('/points/adjust')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, points: 100, note: 'Gaming budget' });

    await request(app)
      .post('/gaming/games')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Rocket League', platform: 'Windows', status: 'Allowed' });

    const payload = { gameName: 'Rocket League', platform: 'Windows', requestedMinutes: 25 };
    const [first, second] = await Promise.all([
      request(app).post('/gaming/sessions/start').set('Authorization', `Bearer ${childToken}`).send(payload),
      request(app).post('/gaming/sessions/start').set('Authorization', `Bearer ${childToken}`).send(payload)
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    const allowedCount = [first.body, second.body].filter((item) => item.allowed === true).length;
    const deniedCount = [first.body, second.body].filter((item) => item.allowed === false && item.code === 'ACTIVE_SESSION_EXISTS').length;
    expect(allowedCount).toBe(1);
    expect(deniedCount).toBe(1);

    const list = await request(app)
      .get('/gaming/sessions')
      .set('Authorization', `Bearer ${childToken}`);
    expect(list.statusCode).toBe(200);
    expect(list.body.filter((session) => session.status === 'Started').length).toBe(1);
  });
});
