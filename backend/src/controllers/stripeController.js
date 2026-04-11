import { stripeCheckoutSchema } from '../utils/validation.js';
import { createCheckoutSession, handleWebhook } from '../services/stripeService.js';

/**
 * POST /stripe/checkout
 * Requires parent auth. Creates a Stripe Checkout session and returns the redirect URL.
 */
export async function createCheckoutSessionController(req, res, next) {
  try {
    const { amountSgd } = stripeCheckoutSchema.parse(req.body);
    const result = await createCheckoutSession(req.auth.parentId, amountSgd);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /stripe/webhook
 * No auth — Stripe signs the payload. Raw body Buffer is required for signature verification.
 */
export async function stripeWebhookController(req, res, next) {
  try {
    const sig = req.headers['stripe-signature'];
    const result = await handleWebhook(req.body, sig);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
