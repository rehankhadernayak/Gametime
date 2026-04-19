import Stripe from 'stripe';
import { env } from '../config/env.js';
import { getDb } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';
import { purchaseParentGp } from './giftcardPointsService.js';

/** Returns a configured Stripe client, or throws 503 if key is absent. */
function getStripe() {
  if (!env.stripeSecretKey) {
    throw new ApiError(503, 'Stripe is not configured on this server. Contact the administrator.');
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
}

/**
 * Creates a Stripe Checkout session for a one-time GP purchase.
 * @param {string} parentId
 * @param {number} amountSgd  - whole SGD integer (e.g. 10 = S$10)
 * @returns {{ url: string }}
 */
export async function createCheckoutSession(parentId, amountSgd) {
  const stripe = getStripe();
  const amountCents = Math.round(amountSgd * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'sgd',
          product_data: {
            name: `Gametime GP - S$${amountSgd} Gaming Funds`,
            description: 'Giftcard Points for your children to spend on gaming rewards'
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: `${env.frontendOrigins[0]}/parent/dashboard?topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendOrigins[0]}/parent/dashboard?topup=cancelled`,
    metadata: {
      parentId,
      amountCents: String(amountCents)
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60 // 30 minutes
  });

  const db = await getDb();
  await db.run(
    `INSERT INTO stripe_sessions (id, parent_id, amount_cents, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [session.id, parentId, amountCents, new Date().toISOString()]
  );

  logger.info({ parentId, amountSgd, sessionId: session.id }, 'Stripe checkout session created');
  return { url: session.url };
}

/**
 * Processes an incoming Stripe webhook event.
 * Verifies the signature, handles checkout.session.completed, and credits GP.
 * @param {Buffer} rawBody
 * @param {string} signature
 * @returns {{ received: boolean }}
 */
export async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    logger.warn({ err: err.message }, 'Stripe webhook signature verification failed');
    throw new ApiError(400, 'Invalid webhook signature');
  }

  // Only act on successful checkout completions
  if (event.type !== 'checkout.session.completed') {
    return { received: true };
  }

  const session = event.data.object;

  // Only process fully paid sessions
  if (session.payment_status !== 'paid') {
    return { received: true };
  }

  const { parentId, amountCents } = session.metadata;
  const db = await getDb();

  // Idempotency check - skip if already credited
  const existing = await db.get(
    `SELECT status FROM stripe_sessions WHERE id = ?`,
    [session.id]
  );
  if (!existing) {
    // Session not found in our DB - log and continue safely
    logger.warn({ sessionId: session.id }, 'Stripe webhook for unknown session; crediting anyway');
  } else if (existing.status === 'completed') {
    logger.info({ sessionId: session.id }, 'Stripe webhook duplicate - already credited; skipping');
    return { received: true };
  }

  // Credit GP inside a single transaction
  await db.exec('BEGIN');
  try {
    await purchaseParentGp({
      parentId,
      points: Number(amountCents),
      moneyAmount: (Number(amountCents) / 100).toFixed(2),
      currency: 'SGD',
      note: `Stripe top-up ${session.id}`,
      dbClient: db
    });

    if (existing) {
      await db.run(
        `UPDATE stripe_sessions SET status = 'completed', completed_at = ? WHERE id = ?`,
        [new Date().toISOString(), session.id]
      );
    } else {
      // Insert a completed record so future duplicates are blocked
      await db.run(
        `INSERT INTO stripe_sessions (id, parent_id, amount_cents, status, created_at, completed_at)
         VALUES (?, ?, ?, 'completed', ?, ?)`,
        [session.id, parentId, Number(amountCents), new Date().toISOString(), new Date().toISOString()]
      );
    }

    await db.exec('COMMIT');
    logger.info({ parentId, amountCents, sessionId: session.id }, 'GP top-up credited via Stripe');
  } catch (err) {
    await db.exec('ROLLBACK');
    logger.error({ err, sessionId: session.id }, 'Failed to credit GP after Stripe payment - will retry on next webhook');
    throw err;
  }

  return { received: true };
}
