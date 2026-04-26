import Stripe from 'stripe';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/errors.js';

const AMAZON_VAULT_PURPOSE = 'amazon_vault_funding';

function getStripe() {
  if (!env.stripeSecretKey) {
    throw new ApiError(503, 'Stripe is not configured on this server. Contact the administrator.');
  }
  return new Stripe(env.stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
}

/**
 * One-time Checkout for parent-funded Amazon gift card vault (manual fulfillment).
 * Does not insert into stripe_sessions or credit GP — ops reconcile in Stripe Dashboard.
 * @param {string} parentId
 * @param {number} amountSgd - whole SGD integer (e.g. 10 = S$10)
 * @returns {{ url: string }}
 */
export async function createAmazonVaultCheckoutSession(parentId, amountSgd) {
  const stripe = getStripe();
  const amountCents = Math.round(amountSgd * 100);
  const base = env.frontendOrigins[0];

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'sgd',
          product_data: {
            name: `Amazon gift card vault — S$${amountSgd}`,
            description: 'Parent funding for Amazon gift cards (fulfilled manually by Gametime)'
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: `${base}/parent/dashboard?payment=success`,
    cancel_url: `${base}/parent/dashboard?payment=cancelled`,
    metadata: {
      parent_id: parentId,
      purpose: AMAZON_VAULT_PURPOSE,
      amount_cents: String(amountCents)
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60
  });

  logger.info(
    { parentId, amountSgd, sessionId: session.id, purpose: AMAZON_VAULT_PURPOSE },
    'Stripe Amazon vault checkout session created'
  );
  return { url: session.url };
}

export { AMAZON_VAULT_PURPOSE };
