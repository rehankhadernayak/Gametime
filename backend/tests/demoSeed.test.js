import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');

beforeEach(async () => {
  await resetTestDb();
  await initDb();
});

afterEach(() => {
  delete process.env.APPLE_REVIEW_DEMO_PARENT_EMAILS;
});

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

describe('POST /tasks/seed-review-demo', () => {
  test('returns 403 when parent email is not on allowlist', async () => {
    const app = createApp();
    const signup = await request(app).post('/auth/signup').send({
      name: 'Regular Parent',
      email: 'regular-parent@example.com',
      password: 'StrongPass123'
    });
    const parentToken = signup.body.token;

    await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Kid',
        dateOfBirth: dobYearsAgo(10),
        email: 'kid-regular@example.com',
        password: 'ChildPass123'
      });

    const res = await request(app)
      .post('/tasks/seed-review-demo')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('creates demo tasks and request when email is allowlisted', async () => {
    process.env.APPLE_REVIEW_DEMO_PARENT_EMAILS = 'reviewer@gametime.app';

    const app = createApp();
    const signup = await request(app).post('/auth/signup').send({
      name: 'Review Parent',
      email: 'reviewer@gametime.app',
      password: 'StrongPass123'
    });
    const parentToken = signup.body.token;

    await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Demo Child',
        dateOfBirth: dobYearsAgo(10),
        email: 'demo-child@example.com',
        password: 'ChildPass123'
      });

    const seed = await request(app)
      .post('/tasks/seed-review-demo')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(seed.statusCode).toBe(200);
    expect(Array.isArray(seed.body.createdTasks)).toBe(true);
    expect(seed.body.createdTasks.length).toBeGreaterThanOrEqual(2);
    expect(seed.body.taskRequest?.id).toBeTruthy();

    const tasks = await request(app).get('/tasks/list').set('Authorization', `Bearer ${parentToken}`);
    expect(tasks.statusCode).toBe(200);
    const titles = tasks.body.tasks.map((t) => t.title);
    expect(titles).toContain('Clean Room');
    expect(titles).toContain('Read 20 mins');
    expect(titles).toContain('Practice piano');

    const reqs = await request(app).get('/tasks/requests').set('Authorization', `Bearer ${parentToken}`);
    expect(reqs.statusCode).toBe(200);
    const roblox = reqs.body.find((r) => r.title === 'Roblox Gift Card' && r.status === 'Pending');
    expect(roblox).toBeTruthy();
  });
});
