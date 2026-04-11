import request from 'supertest';
import { beforeAll, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');

await resetTestDb();
await initDb();
const app = createApp();

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

const evidence = {
  evidenceData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
  evidenceMime: 'image/png',
  evidenceType: 'Photo',
  evidenceNote: 'Done!'
};

let parentToken;
let childToken;
let childId;

beforeAll(async () => {
  const signup = await request(app).post('/auth/signup').send({
    name: 'Achievement Parent',
    email: 'achparent@example.com',
    password: 'StrongPass123'
  });
  parentToken = signup.body.token;

  const childCreate = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ name: 'Achiever', dateOfBirth: dobYearsAgo(10), email: 'achiever@example.com', password: 'KidPass123' });
  childId = childCreate.body.id;

  const childLoginRes = await request(app)
    .post('/auth/child-login')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId });
  childToken = childLoginRes.body.token;
});

describe('Achievements', () => {
  test('child can list all achievements with unlocked=0 initially', async () => {
    const res = await request(app)
      .get('/achievements/list')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.achievements)).toBe(true);
    expect(res.body.achievements.length).toBeGreaterThan(0);
    for (const ach of res.body.achievements) {
      expect(ach.unlocked).toBe(0);
    }
  });

  test('parent can view achievements for a specific child', async () => {
    const res = await request(app)
      .get(`/achievements/list?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.achievements)).toBe(true);
  });

  test('parent listing achievements without childId gets 400', async () => {
    const res = await request(app)
      .get('/achievements/list')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.statusCode).toBe(400);
  });

  test('streak starts at 0 for a new child', async () => {
    const res = await request(app)
      .get(`/achievements/streak?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.streak).toBe(0);
  });

  test('completing first task unlocks first_task achievement and streak becomes 1', async () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const taskCreate = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'First chore', description: 'Do it', childId, points: 10, dueDate });
    const taskId = taskCreate.body.id;
    expect(taskId).toBeTruthy();

    const completeRes = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidence });
    expect(completeRes.statusCode).toBe(200);

    const approveRes = await request(app)
      .post('/tasks/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId });
    expect(approveRes.statusCode).toBe(200);

    // Streak should be 1
    const streakRes = await request(app)
      .get(`/achievements/streak?childId=${childId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(streakRes.body.streak).toBe(1);

    // first_task achievement should be unlocked
    const achRes = await request(app)
      .get('/achievements/list')
      .set('Authorization', `Bearer ${childToken}`);
    const firstTask = achRes.body.achievements.find(a => a.key === 'first_task');
    expect(firstTask).toBeDefined();
    expect(firstTask.unlocked).toBe(1);
  });

  test('achievement list includes correct structure', async () => {
    const res = await request(app)
      .get('/achievements/list')
      .set('Authorization', `Bearer ${childToken}`);
    const ach = res.body.achievements[0];
    expect(ach).toHaveProperty('id');
    expect(ach).toHaveProperty('key');
    expect(ach).toHaveProperty('name');
    expect(ach).toHaveProperty('icon');
    expect(ach).toHaveProperty('type');
    expect(ach).toHaveProperty('threshold');
    expect(ach).toHaveProperty('unlocked');
  });

  test('unauthenticated request is rejected with 401', async () => {
    const res = await request(app).get('/achievements/list');
    expect(res.statusCode).toBe(401);
  });
});
