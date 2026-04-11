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

const evidencePayload = {
  evidenceData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
  evidenceMime: 'image/png',
  evidenceType: 'Photo',
  evidenceNote: 'Test evidence'
};

async function bootstrapFamily(app, suffix = 'a') {
  const parentEmail = `gift-parent-${suffix}@example.com`;
  const childEmail = `gift-kid-${suffix}@example.com`;

  const signup = await request(app).post('/auth/signup').send({
    name: 'Gift Parent',
    email: parentEmail,
    password: 'StrongPass123'
  });
  expect(signup.statusCode).toBe(201);

  const parentToken = signup.body.token;

  const childCreate = await request(app)
    .post('/children/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      name: 'Gift Kid',
      dateOfBirth: dobYearsAgo(10),
      email: childEmail,
      password: 'ChildPass123'
    });
  expect(childCreate.statusCode).toBe(201);

  const childId = childCreate.body.id;

  const childSession = await request(app)
    .post('/auth/child-login')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ childId });
  expect(childSession.statusCode).toBe(200);

  const childToken = childSession.body.token;

  return {
    parentToken,
    childToken,
    childId,
    parentEmail,
    childEmail
  };
}

async function purchaseMockInventory(app, parentToken, merchantOrderRequestId = undefined) {
  const purchase = await request(app)
    .post('/giftcards/purchase')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      merchantOrderRequestId,
      giftcardId: 'mock-steam',
      giftcardName: 'Steam Voucher',
      skuId: 'mock-steam-150',
      skuName: 'Steam 150',
      quantity: 2,
      currency: 'INR',
      fulfilmentType: 'VOUCHER'
    });

  expect(purchase.statusCode).toBe(201);
  expect(purchase.body.status).toBe('completed');
  return purchase.body;
}

/**
 * Routes GP from parent wallet to child wallet via the task flow:
 * parent buys GP → creates task with gpPoints → child completes → parent approves → child earns GP.
 */
async function giveChildGp(app, { parentToken, childToken, childId, gpPoints }) {
  const gpPurchase = await request(app)
    .post('/giftcards/gp/purchase')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ gpPoints, currency: 'SGD', note: 'GP grant via task' });
  expect(gpPurchase.statusCode).toBe(201);

  const taskRes = await request(app)
    .post('/tasks/create')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({
      childId,
      title: 'GP Earn Task',
      description: 'Complete to earn giftcard points',
      points: 5,
      gpPoints,
      dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    });
  expect(taskRes.statusCode).toBe(201);
  const taskId = taskRes.body.id;

  const completeRes = await request(app)
    .post('/tasks/complete')
    .set('Authorization', `Bearer ${childToken}`)
    .send({ taskId, ...evidencePayload });
  expect(completeRes.statusCode).toBe(200);

  const approveRes = await request(app)
    .post('/tasks/approve')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ taskId });
  expect(approveRes.statusCode).toBe(200);
}

describe('Giftcard integration', () => {
  test('parent can add Amazon-bought giftcodes manually and publish as reward', async () => {
    const app = createApp();
    const { parentToken, childToken, childId } = await bootstrapFamily(app, 'manual');

    const manualBatch = await request(app)
      .post('/giftcards/inventory/manual')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        store: 'Amazon',
        purchaseReference: 'AMZ-ORDER-123456',
        giftcardName: 'Amazon Singapore Gift Card',
        skuName: 'SGD 20',
        currency: 'SGD',
        codes: [
          { code: 'AMZ-SG-CODE-001', pin: '1111', expiryDate: '2028-12-31' },
          { code: 'AMZ-SG-CODE-002', pin: '2222', expiryDate: '2028-12-31' }
        ]
      });

    expect(manualBatch.statusCode).toBe(201);
    expect(manualBatch.body.source).toBe('manual');
    expect(manualBatch.body.quantityAvailable).toBe(2);

    const rewardCreate = await request(app)
      .post('/giftcards/inventory/create-reward')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        batchId: manualBatch.body.id,
        title: 'Amazon SGD 20',
        pointsCost: 25,
        quantityLimit: 2,
        active: true
      });

    expect(rewardCreate.statusCode).toBe(201);

    // Give child enough GP to cover the reward cost (25 GP)
    await giveChildGp(app, { parentToken, childToken, childId, gpPoints: 30 });

    const redeem = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId: rewardCreate.body.rewardId });

    expect(redeem.statusCode).toBe(201);
    expect(redeem.body.fulfilled).toBe(true);
    expect(redeem.body.delivery).toBe('Giftcard');

    const redemptionDetails = await request(app)
      .get(`/giftcards/redemptions/${redeem.body.redemptionId}/details`)
      .set('Authorization', `Bearer ${childToken}`);

    expect(redemptionDetails.statusCode).toBe(200);
    expect(redemptionDetails.body.giftcardName).toContain('Amazon');
    expect(redemptionDetails.body.code).toBeTruthy();
  });

  test('parent purchases inventory, creates reward, child redeems and sees giftcode details', async () => {
    const app = createApp();
    const { parentToken, childToken, childId } = await bootstrapFamily(app, 'flow');

    const catalog = await request(app)
      .get('/giftcards/catalog')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(catalog.statusCode).toBe(200);
    expect(catalog.body.giftcards.length).toBeGreaterThan(0);

    const skus = await request(app)
      .get('/giftcards/catalog/mock-steam/skus')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(skus.statusCode).toBe(200);
    expect(skus.body.skus.length).toBeGreaterThan(0);

    const purchase = await purchaseMockInventory(app, parentToken);
    expect(purchase.quantityAvailable).toBe(2);

    const rewardCreate = await request(app)
      .post('/giftcards/inventory/create-reward')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        batchId: purchase.id,
        title: 'Steam Code Reward',
        pointsCost: 15,
        quantityLimit: 2,
        active: true
      });

    expect(rewardCreate.statusCode).toBe(201);
    const rewardId = rewardCreate.body.rewardId;

    // Give child enough GP to cover the reward cost (15 GP)
    await giveChildGp(app, { parentToken, childToken, childId, gpPoints: 20 });

    const redeem = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId });

    expect(redeem.statusCode).toBe(201);
    expect(redeem.body.fulfilled).toBe(true);
    expect(redeem.body.delivery).toBe('Giftcard');

    const redemptionDetails = await request(app)
      .get(`/giftcards/redemptions/${redeem.body.redemptionId}/details`)
      .set('Authorization', `Bearer ${childToken}`);

    expect(redemptionDetails.statusCode).toBe(200);
    expect(redemptionDetails.body.code).toBeTruthy();
    expect(redemptionDetails.body.giftcardName).toContain('Steam');

    const rewardList = await request(app)
      .get('/rewards/list')
      .set('Authorization', `Bearer ${childToken}`);
    expect(rewardList.statusCode).toBe(200);
    const linkedReward = rewardList.body.find((reward) => reward.id === rewardId);
    expect(linkedReward?.isGiftcard).toBe(true);

    const inventoryAfter = await request(app)
      .get('/giftcards/inventory')
      .set('Authorization', `Bearer ${parentToken}`);
    expect(inventoryAfter.statusCode).toBe(200);
    expect(inventoryAfter.body[0].quantityAvailable).toBe(1);
  });

  test('idempotent purchase and out-of-stock enforcement work', async () => {
    const app = createApp();
    const { parentToken, childToken, childId } = await bootstrapFamily(app, 'stock');

    const merchantOrderRequestId = 'ORDER-IDEMPOTENT-12345';
    const firstPurchase = await purchaseMockInventory(app, parentToken, merchantOrderRequestId);
    const secondPurchase = await request(app)
      .post('/giftcards/purchase')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        merchantOrderRequestId,
        giftcardId: 'mock-steam',
        giftcardName: 'Steam Voucher',
        skuId: 'mock-steam-150',
        skuName: 'Steam 150',
        quantity: 2,
        currency: 'INR',
        fulfilmentType: 'VOUCHER'
      });

    expect(secondPurchase.statusCode).toBe(201);
    expect(secondPurchase.body.id).toBe(firstPurchase.id);
    expect(secondPurchase.body.idempotent).toBe(true);

    const rewardCreate = await request(app)
      .post('/giftcards/inventory/create-reward')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        batchId: firstPurchase.id,
        title: 'Single Use Steam',
        pointsCost: 20,
        quantityLimit: 1,
        active: true
      });
    expect(rewardCreate.statusCode).toBe(201);

    // Give child enough GP to attempt two redemptions (only first should succeed due to quantityLimit: 1)
    await giveChildGp(app, { parentToken, childToken, childId, gpPoints: 25 });

    const firstRedeem = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId: rewardCreate.body.rewardId });
    expect(firstRedeem.statusCode).toBe(201);

    const secondRedeem = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId: rewardCreate.body.rewardId });

    expect(secondRedeem.statusCode).toBe(400);
    expect(secondRedeem.body.error).toContain('out of stock');

    const sync = await request(app)
      .post(`/giftcards/inventory/${firstPurchase.id}/sync`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(sync.statusCode).toBe(200);
    expect(sync.body.synced).toBe(true);
  });

  test('giftcode details are isolated by role and family', async () => {
    const app = createApp();
    const familyA = await bootstrapFamily(app, 'fa');

    const purchase = await purchaseMockInventory(app, familyA.parentToken, 'ORDER-ISOLATION-A');
    const rewardCreate = await request(app)
      .post('/giftcards/inventory/create-reward')
      .set('Authorization', `Bearer ${familyA.parentToken}`)
      .send({
        batchId: purchase.id,
        title: 'Family A Gift',
        pointsCost: 10,
        quantityLimit: 1,
        active: true
      });

    // Give family A child enough GP to cover the reward cost (10 GP)
    await giveChildGp(app, {
      parentToken: familyA.parentToken,
      childToken: familyA.childToken,
      childId: familyA.childId,
      gpPoints: 15
    });

    const redeem = await request(app)
      .post('/rewards/redeem')
      .set('Authorization', `Bearer ${familyA.childToken}`)
      .send({ rewardId: rewardCreate.body.rewardId });
    expect(redeem.statusCode).toBe(201);

    const familyB = await bootstrapFamily(app, 'fb');

    const deniedChild = await request(app)
      .get(`/giftcards/redemptions/${redeem.body.redemptionId}/details`)
      .set('Authorization', `Bearer ${familyB.childToken}`);
    expect(deniedChild.statusCode).toBe(404);

    const deniedParent = await request(app)
      .get(`/giftcards/redemptions/${redeem.body.redemptionId}/details`)
      .set('Authorization', `Bearer ${familyB.parentToken}`);
    expect(deniedParent.statusCode).toBe(404);
  });
});
