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
    name: 'Request Parent',
    email: 'request-parent@example.com',
    password: 'StrongPass123'
  });
  const parentToken = signup.body.token;

  const child = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      name: 'Requester Kid',
      dateOfBirth: dobYearsAgo(10),
      email: 'request-kid@example.com',
      password: 'ChildPass123'
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

describe('Task request flow', () => {
  test('child requests task and parent approves into real task', async () => {
    const { app, parentToken, childToken } = await bootstrap();

    const createRequest = await request(app)
      .post('/tasks/request')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        title: 'Need points for weekend',
        description: 'Please give me a short coding quest.',
        requestedPoints: 20
      });

    expect(createRequest.statusCode).toBe(201);
    expect(createRequest.body.status).toBe('Pending');

    const parentRequests = await request(app)
      .get('/tasks/requests')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(parentRequests.statusCode).toBe(200);
    expect(parentRequests.body[0].status).toBe('Pending');

    const approve = await request(app)
      .post(`/tasks/requests/${createRequest.body.id}/approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ note: 'Approved. Complete this today.' });
    expect(approve.statusCode).toBe(200);
    expect(approve.body.ignored).toBe(false);
    expect(approve.body.taskId).toBeTruthy();

    const parentTasks = await request(app)
      .get('/tasks/list')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(parentTasks.statusCode).toBe(200);
    const createdTask = parentTasks.body.find((item) => item.id === approve.body.taskId);
    expect(createdTask).toBeTruthy();
    expect(createdTask.state).toBe('Active');

    const childRequests = await request(app)
      .get('/tasks/requests')
      .set('Authorization', `Bearer ${childToken}`);
    expect(childRequests.statusCode).toBe(200);
    expect(childRequests.body[0].status).toBe('Approved');
    expect(childRequests.body[0].linkedTaskId).toBe(approve.body.taskId);
  });

  test('parent can reject task request with note', async () => {
    const { app, parentToken, childToken } = await bootstrap();

    const createRequest = await request(app)
      .post('/tasks/request')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        title: 'Need quick points',
        description: 'Can I get a short task?',
        requestedPoints: 15
      });
    expect(createRequest.statusCode).toBe(201);

    const reject = await request(app)
      .post(`/tasks/requests/${createRequest.body.id}/reject`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ note: 'Finish pending tasks first.' });
    expect(reject.statusCode).toBe(200);
    expect(reject.body.ignored).toBe(false);

    const childRequests = await request(app)
      .get('/tasks/requests')
      .set('Authorization', `Bearer ${childToken}`);
    expect(childRequests.statusCode).toBe(200);
    expect(childRequests.body[0].status).toBe('Rejected');
    expect(childRequests.body[0].parentNote).toContain('Finish pending tasks first.');
  });

  test('child can cancel pending request', async () => {
    const { app, parentToken, childToken } = await bootstrap();

    const createRequest = await request(app)
      .post('/tasks/request')
      .set('Authorization', `Bearer ${childToken}`)
      .send({
        title: 'Another task please',
        description: 'Requesting one more task.',
        requestedPoints: 10
      });
    expect(createRequest.statusCode).toBe(201);

    const cancel = await request(app)
      .delete(`/tasks/requests/${createRequest.body.id}`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(cancel.statusCode).toBe(200);
    expect(cancel.body.ignored).toBe(false);

    const parentRequests = await request(app)
      .get('/tasks/requests')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(parentRequests.statusCode).toBe(200);
    expect(parentRequests.body[0].status).toBe('Cancelled');
  });
});
