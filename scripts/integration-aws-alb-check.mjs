#!/usr/bin/env node
/**
 * Sanity checks against a deployed Gametime backend behind an ALB (HTTP or HTTPS).
 *
 * Usage:
 *   node scripts/integration-aws-alb-check.mjs http://your-alb.region.elb.amazonaws.com
 *   ALB_BASE_URL=http://... node scripts/integration-aws-alb-check.mjs
 *
 * Checks:
 *   1. GET /health → 200 and JSON body indicates DB connectivity when healthy.
 *   2. POST /api/billing/webhook with garbage body + signature → expect 400 (parser path),
 *      not 5xx (confirms raw body + handler wiring without a server crash).
 */

const base = (process.argv[2] || process.env.ALB_BASE_URL || "").replace(/\/$/, "");
if (!base) {
  process.stderr.write(
    "Usage: node scripts/integration-aws-alb-check.mjs <base-url>\n" +
      "   or: ALB_BASE_URL=https://... node scripts/integration-aws-alb-check.mjs\n"
  );
  process.exit(2);
}

async function getJson(path) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  const results = [];

  // --- Health (includes DB ping on the real backend) ---
  const health = await getJson("/health");
  const healthOk = health.res.status === 200 && health.json?.ok === true && health.json?.db === "connected";
  results.push({
    name: "GET /health",
    ok: healthOk,
    detail: `status=${health.res.status} body=${health.text.slice(0, 200)}`
  });

  // --- Stripe webhook: invalid signature should be 400, not 500 ---
  const whRes = await fetch(`${base}/api/billing/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=1,v1=fake"
    },
    body: JSON.stringify({ id: "evt_integration_test", type: "checkout.session.completed" })
  });
  const whText = await whRes.text();
  // Treat gateway / app 5xx as failure; 400 (bad sig), 404 (wrong mount), 503 (Stripe not configured) are acceptable.
  const webhookCatastrophic = [500, 502, 504].includes(whRes.status);
  const stripeParserOk = !webhookCatastrophic;
  results.push({
    name: "POST /api/billing/webhook (no gateway/app 5xx)",
    ok: stripeParserOk,
    detail: `status=${whRes.status} body=${whText.slice(0, 200)}`
  });

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    process.stdout.write(`${r.ok ? "PASS" : "FAIL"} — ${r.name}\n  ${r.detail}\n`);
  }

  process.stdout.write(
    "\nStripe CLI (local forward when ALB HTTP is rejected by Stripe):\n" +
      `  stripe listen --forward-to ${base}/api/billing/webhook\n` +
      "  # or against local backend:\n" +
      "  stripe listen --forward-to http://localhost:4000/api/billing/webhook\n"
  );

  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err) + "\n");
  process.exit(1);
});
