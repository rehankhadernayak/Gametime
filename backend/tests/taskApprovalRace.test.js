import request from 'supertest';
import { beforeEach, describe, expect, test } from 'vitest';
import { resetTestDb, setupTestEnv } from './setupTestDb.js';

setupTestEnv();

const { initDb } = await import('../src/db/init.js');
const { createApp } = await import('../src/app.js');
const { getDb } = await import('../src/db/connection.js');

const evidencePayload = {
  evidenceData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
  evidenceMime: 'image/png',
  evidenceType: 'Photo',
  evidenceNote: 'Test evidence'
};

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

beforeEach(async () => {
  await resetTestDb();
  await initDb();
});

describe('task approval safety', () => {
  test('rejects deleting an approved task', async () => {
    const app = createApp();

    const signup = await request(app).post('/auth/signup').send({
      name: 'Delete Parent',
      email: 'delete@example.com',
      password: 'StrongPass123'
    });
    const parentToken = signup.body.token;

    const childCreate = await request(app)
      .post('/children/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        name: 'Delete Kid',
        dateOfBirth: dobYearsAgo(10),
        email: 'deletekid@example.com',
        password: 'ChildPass123'
      });
    const childId = childCreate.body.id;

    const childSession = await request(app)
      .post('/auth/child-login')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId });
    const childToken = childSession.body.token;

    const taskRes = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        title: 'Approved Task',
        description: 'Cannot delete',
        points: 10,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      });
    const taskId = taskRes.body.id;

    await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidencePayload });

    await request(app)
      .post('/tasks/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId });

    const deleteRes = await request(app)
      .delete(`/tasks/${taskId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(deleteRes.statusCode).toBe(400);
    expect(String(deleteRes.body.error || '')).toMatch(/approved/i);
  });
});
