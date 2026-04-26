import { stripeCheckoutSchema } from '../utils/validation.js';
import { createAmazonVaultCheckoutSession } from '../services/billingService.js';

/**
 * POST /billing/create-checkout (proxied as /api/billing/create-checkout in dev)
 * Parent auth. Creates a Stripe Checkout session for Amazon vault funding; manual fulfillment.
 */
export async function createBillingCheckoutController(req, res, next) {
  try {
    const { amountSgd } = stripeCheckoutSchema.parse(req.body);
    const result = await createAmazonVaultCheckoutSession(req.auth.parentId, amountSgd);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
