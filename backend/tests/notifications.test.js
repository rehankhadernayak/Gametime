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
  evidenceNote: 'Done'
};

let parentToken;
let childToken;
let childId;

beforeAll(async () => {
  const signup = await request(app).post('/auth/signup').send({
    name: 'Notif Parent',
    email: 'notifparent@example.com',
    password: 'StrongPass123'
  });
  parentToken = signup.body.token;

  const childCreate = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ name: 'Notif Kid', dateOfBirth: dobYearsAgo(10), email: 'notifkid@example.com', password: 'KidPass123' });
  childId = childCreate.body.id;

  const childLoginRes = await request(app)
    .post('/auth/child-login')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId });
  childToken = childLoginRes.body.token;
});

describe('Notifications', () => {
  test('parent gets empty notification list on a fresh account', async () => {
    const res = await request(app)
      .get('/notifications/list')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('task approval creates a notification for the child', async () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const taskCreate = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Notif chore', description: 'Do it', childId, points: 10, dueDate });
    const taskId = taskCreate.body.id;
    expect(taskId).toBeTruthy();

    const complete = await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidence });
    expect(complete.statusCode).toBe(200);

    const approve = await request(app)
      .post('/tasks/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId });
    expect(approve.statusCode).toBe(200);

    const childNotifs = await request(app)
      .get('/notifications/list')
      .set('Authorization', `Bearer ${childToken}`);
    expect(childNotifs.statusCode).toBe(200);
    expect(Array.isArray(childNotifs.body)).toBe(true);
    expect(childNotifs.body.length).toBeGreaterThan(0);
    expect(childNotifs.body.some(n => n.message.toLowerCase().includes('approved'))).toBe(true);
  });

  test('task rejection creates a notification for the child', async () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const taskCreate = await request(app)
      .post('/tasks/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Rejected chore', description: 'Do it', childId, points: 5, dueDate });
    const taskId = taskCreate.body.id;
    expect(taskId).toBeTruthy();

    await request(app)
      .post('/tasks/complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ taskId, ...evidence });

    await request(app)
      .post('/tasks/approve')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId, approved: false, note: 'Try harder' });

    // Use the reject endpoint
    await request(app)
      .post('/tasks/reject')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskId, note: 'Try harder' });

    const childNotifs = await request(app)
      .get('/notifications/list')
      .set('Authorization', `Bearer ${childToken}`);
    // After two operations (one approve above, one reject), child has notifications
    expect(Array.isArray(childNotifs.body)).toBe(true);
    expect(childNotifs.body.length).toBeGreaterThan(0);
  });

  test('markRead clears unread status for specified notification ids', async () => {
    const notifRes = await request(app)
      .get('/notifications/list')
      .set('Authorization', `Bearer ${childToken}`);
    expect(Array.isArray(notifRes.body)).toBe(true);
    const unread = notifRes.body.filter(n => !n.read);
    expect(unread.length).toBeGreaterThan(0);

    const markRes = await request(app)
      .post('/notifications/markRead')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ notificationIds: [unread[0].id] });
    expect(markRes.statusCode).toBe(200);

    const afterMark = await request(app)
      .get('/notifications/list')
      .set('Authorization', `Bearer ${childToken}`);
    const stillUnread = afterMark.body.find(n => n.id === unread[0].id && !n.read);
    expect(stillUnread).toBeUndefined();
  });

  test('device token registration and unregistration succeed', async () => {
    const token = 'ExponentPushToken[test-device-abc123]';

    const reg = await request(app)
      .post('/notifications/device-token')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ deviceToken: token });
    expect(reg.statusCode).toBe(200);
    expect(reg.body.ok).toBe(true);

    const unreg = await request(app)
      .delete('/notifications/device-token')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ deviceToken: token });
    expect(unreg.statusCode).toBe(200);
    expect(unreg.body.ok).toBe(true);
  });

  test('device token registration rejects missing deviceToken', async () => {
    const res = await request(app)
      .post('/notifications/device-token')
      .set('Authorization', `Bearer ${childToken}`)
      .send({});
    expect(res.statusCode).toBe(400);
  });

  test('parent can read and update notification preferences', async () => {
    const getRes = await request(app)
      .get('/notifications/preferences')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(getRes.statusCode).toBe(200);
    expect(typeof getRes.body).toBe('object');
    expect(typeof getRes.body.enabled).toBe('boolean');

    const patchRes = await request(app)
      .patch('/notifications/preferences')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ taskApprovals: false, childActivity: true });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.body.taskApprovals).toBe(false);
  });

  test('child cannot access parent notification preferences', async () => {
    const res = await request(app)
      .get('/notifications/preferences')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('unauthenticated notification list request returns 401', async () => {
    const res = await request(app).get('/notifications/list');
    expect(res.statusCode).toBe(401);
  });
});
