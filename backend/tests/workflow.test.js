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
let childToken;
let childId;
let taskId;
let rewardId;
function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}
const evidencePayload = {
  evidenceData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
  evidenceMime: 'image/png',
  evidenceType: 'Photo',
  evidenceNote: 'Test evidence'
};

beforeAll(async () => {
  const signupRes = await request(app).post('/auth/signup').send({
    name: 'Parent One',
    email: 'parent@example.com',
    password: 'StrongPass123'
  });
  parentToken = signupRes.body.token;

  const childRes = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ name: 'Kid', dateOfBirth: dobYearsAgo(10), email: 'kidflow@example.com', password: 'KidFlow123' });
  childId = childRes.body.id;

  const childLoginRes = await request(app)
    .post('/auth/child-login')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId });
  childToken = childLoginRes.body.token;
});

describe('Parent-child workflow', () => {
  test('create task -> complete -> approve -> credit points (ignore duplicate approval)', async () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const createTaskRes = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        title: 'Brush Teeth',
        description: 'Morning and night',
        points: 10,
        dueDate
      });

    taskId = createTaskRes.body.id;

    const completeRes = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidencePayload });
    expect(completeRes.statusCode).toBe(200);
    expect(completeRes.body.ignored).toBe(false);

    const duplicateComplete = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidencePayload });
    expect(duplicateComplete.statusCode).toBe(409);
    expect(String(duplicateComplete.body.error || '')).toMatch(/review|submitted/i);

    const approveRes = await request(app)
      .post('/tasks/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId });
    expect(approveRes.body.ignored).toBe(false);

    const completeAfterApprove = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidencePayload });
    expect(completeAfterApprove.statusCode).toBe(409);

    const duplicateApprove = await request(app)
      .post('/tasks/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId });
    expect(duplicateApprove.body.ignored).toBe(true);

    const meRes = await request(app).get('/auth/me').set('Authorization', `Bearer ${childToken}`);
    expect(meRes.body.user.pointsBalance).toBe(10);
  });

  test('reward redemption fails on insufficient points and succeeds otherwise', async () => {
    const createRewardRes = await request(app)
      .post('/rewards/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Movie Night', pointsCost: 50, quantityLimit: 2, active: true });

    rewardId = createRewardRes.body.id;

    const failRes = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId });

    expect(failRes.statusCode).toBe(400);
    expect(failRes.body.error).toContain('Insufficient points');

    await request(app)
      .post('/points/adjust')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ childId, points: 60, note: 'Bonus' });

    const okRes = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId });
    expect(okRes.statusCode).toBe(201);
  });

  test('delete reward with pending redemption refunds points and notifies child', async () => {
    const meBefore = await request(app).get('/auth/me').set('Authorization', `Bearer ${childToken}`);
    const before = meBefore.body.user.pointsBalance;

    const deleteRes = await request(app)
      .delete(`/rewards/${rewardId}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.refundedCount).toBe(1);

    const meAfter = await request(app).get('/auth/me').set('Authorization', `Bearer ${childToken}`);
    expect(meAfter.body.user.pointsBalance).toBeGreaterThan(before);

    const notifications = await request(app)
      .get('/notifications/list')
      .set('Authorization', `Bearer ${childToken}`);
    expect(notifications.body.some((n) => n.message.includes('points restored'))).toBe(true);
  });

  test('task expires and cannot award points', async () => {
    const dueDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const createTaskRes = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        title: 'Soon Expired',
        description: 'This should expire',
        points: 5,
        dueDate
      });

    const db = await getDb();
    await db.run(
      `UPDATE tasks SET due_date = ?, state = 'Active' WHERE id = ?`,
      [new Date(Date.now() - 60_000).toISOString(), createTaskRes.body.id]
    );

    await request(app).get('/tasks/list').set('Authorization', `Bearer ${childToken}`);

    const complete = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId: createTaskRes.body.id, ...evidencePayload });

    expect(complete.statusCode).toBe(400);
    expect(complete.body.error).toContain('expired');
  });

  test('rejected task can be disputed with notes', async () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const createTaskRes = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        title: 'Tidy Desk',
        description: 'Desk photo proof',
        points: 8,
        dueDate
      });

    await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        taskId: createTaskRes.body.id,
        ...evidencePayload,
        evidenceNote: 'I cleaned everything'
      });

    const reject = await request(app)
      .post('/tasks/reject')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId: createTaskRes.body.id, note: 'Need clearer photo' });
    expect(reject.statusCode).toBe(200);

    const dispute = await request(app)
      .post('/tasks/dispute')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId: createTaskRes.body.id, note: 'I can re-upload after school' });
    expect(dispute.statusCode).toBe(200);

    const taskList = await request(app).get('/tasks/list').set('Authorization', `Bearer ${parentToken}`);
    const disputed = taskList.body.find((t) => t.id === createTaskRes.body.id);
    expect(disputed.disputed).toBe(1);
    expect(disputed.parentNote).toContain('Need clearer photo');
  });

  test('rejected task returns to active and can be resubmitted', async () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const createTaskRes = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        title: 'Make Bed',
        description: 'Take a clear photo',
        points: 6,
        dueDate
      });

    const firstSubmit = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId: createTaskRes.body.id, ...evidencePayload, evidenceNote: 'First photo' });
    expect(firstSubmit.statusCode).toBe(200);

    const reject = await request(app)
      .post('/tasks/reject')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId: createTaskRes.body.id, note: 'Please retake with better light' });
    expect(reject.statusCode).toBe(200);

    const childTasks = await request(app).get('/tasks/list').set('Authorization', `Bearer ${childToken}`);
    const taskAfterReject = childTasks.body.find((t) => t.id === createTaskRes.body.id);
    expect(taskAfterReject.state).toBe('Active');
    expect(taskAfterReject.parentNote).toContain('Please retake');

    const resubmit = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId: createTaskRes.body.id, ...evidencePayload, evidenceNote: 'Retaken photo' });

    expect(resubmit.statusCode).toBe(200);
    expect(resubmit.body.ignored).toBe(false);
    expect(String(resubmit.body.message || '').toLowerCase()).toContain('resubmitted');
  });

  test('sanitized-empty task/reward text is rejected', async () => {
    const dueDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const badTask = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        title: '<>',
        description: 'Valid description',
        points: 10,
        dueDate
      });
    expect(badTask.statusCode).toBe(400);
    expect(badTask.body.error).toContain('cannot be empty');

    const badReward = await request(app)
      .post('/rewards/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        title: '<>',
        pointsCost: 10,
        quantityLimit: 1,
        active: true
      });
    expect(badReward.statusCode).toBe(400);
    expect(badReward.body.error).toContain('cannot be empty');
  });
});
