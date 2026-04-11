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
let childToken;
let childId;

function dobYearsAgo(years) {
  const now = new Date();
  const dob = new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()));
  return dob.toISOString().slice(0, 10);
}

beforeAll(async () => {
  const signupRes = await request(app).post('/auth/signup').send({
    name: 'Fulfill Parent',
    email: 'fulfillparent@example.com',
    password: 'Password123'
  });
  expect(signupRes.statusCode).toBe(201);
  parentToken = signupRes.body.token;

  const childRes = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      name: 'Fulfill Child',
      dateOfBirth: dobYearsAgo(10),
      email: 'fulfillchild@example.com',
      password: 'ChildPass123'
    });
  expect(childRes.statusCode).toBe(201);
  childId = childRes.body.id;

  const childLoginRes = await request(app)
    .post('/auth/child-login')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId });
  expect(childLoginRes.statusCode).toBe(200);
  childToken = childLoginRes.body.token;

  // Give the child points via manual adjustment
  await request(app)
    .post('/points/adjust')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId, points: 200, note: 'Test points' });
});

describe('Reward fulfill', () => {
  test('full workflow: create reward -> child redeems -> parent fulfills', async () => {
    // Create reward
    const createRes = await request(app)
      .post('/rewards/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Ice Cream', pointsCost: 50, quantityLimit: 5, active: true });
    expect(createRes.statusCode).toBe(201);
    const rewardId = createRes.body.id;

    // Child redeems
    const redeemRes = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId });
    expect(redeemRes.statusCode).toBe(201);
    expect(redeemRes.body.fulfilled).toBe(false);
    const redemptionId = redeemRes.body.redemptionId;
    expect(redemptionId).toBeTruthy();

    // Parent fulfills
    const fulfillRes = await request(app)
      .post(`/rewards/fulfill/${redemptionId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(fulfillRes.statusCode).toBe(200);
    expect(fulfillRes.body.ignored).toBe(false);
  });

  test('fulfilling an already-fulfilled redemption is idempotent (ignored)', async () => {
    const createRes = await request(app)
      .post('/rewards/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Board Game', pointsCost: 10, quantityLimit: null, active: true });
    expect(createRes.statusCode).toBe(201);
    const rewardId = createRes.body.id;

    const redeemRes = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId });
    expect(redeemRes.statusCode).toBe(201);
    const redemptionId = redeemRes.body.redemptionId;

    // Fulfill once
    const first = await request(app)
      .post(`/rewards/fulfill/${redemptionId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(first.statusCode).toBe(200);
    expect(first.body.ignored).toBe(false);

    // Fulfill again — should be ignored
    const second = await request(app)
      .post(`/rewards/fulfill/${redemptionId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(second.statusCode).toBe(200);
    expect(second.body.ignored).toBe(true);
  });

  test('fulfill requires parent auth', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const fakeId = uuidv4();
    const res = await request(app)
      .post(`/rewards/fulfill/${fakeId}`);
    expect(res.statusCode).toBe(401);
  });

  test('fulfill with non-existent redemptionId returns 404', async () => {
    const { v4: uuidv4 } = await import('uuid');
    const fakeId = uuidv4();
    const res = await request(app)
      .post(`/rewards/fulfill/${fakeId}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(res.statusCode).toBe(404);
  });

  test('child cannot redeem reward with insufficient points', async () => {
    const createRes = await request(app)
      .post('/rewards/create')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Expensive Reward', pointsCost: 1000, quantityLimit: 1, active: true });
    expect(createRes.statusCode).toBe(201);
    const rewardId = createRes.body.id;

    const redeemRes = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId });
    expect(redeemRes.statusCode).toBe(400);
    expect(redeemRes.body.error).toMatch(/insufficient points/i);
  });
});
