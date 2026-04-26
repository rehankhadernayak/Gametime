#!/usr/bin/env node
/**
 * One-shot secret handover (local only):
 * 1) Read repo-root .env.secrets
 * 2) PutParameter (SecureString) to AWS SSM — no AWS CLI required
 * 3) Write web-next/.env.deployment and run scripts/push-vercel-production.mjs
 * 4) On full success, delete .env.secrets and web-next/.env.deployment
 *
 * Env:
 *   AWS_REGION — default ap-southeast-1 (matches infra/aws/terraform default)
 *   SSM_PARAMETER_PREFIX — default gametime/prod (no leading slash; paths become /prefix/KEY)
 *
 * .env.secrets keys:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY — SDK only (not written to SSM)
 *   VERCEL_TOKEN, STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET
 *   API_PROXY_TARGET or RAILWAY_PUBLIC_API_URL or NEXT_PUBLIC_API_URL — public backend URL (no trailing slash)
 * Optional: any key from infra/aws/terraform/locals.tf ssm_secret_names if you add them to .env.secrets
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SECRETS_FILE = join(REPO_ROOT, ".env.secrets");
const WEB_NEXT = join(REPO_ROOT, "web-next");
const DEPLOYMENT_FILE = join(WEB_NEXT, ".env.deployment");

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
const SSM_PREFIX = (process.env.SSM_PARAMETER_PREFIX || "gametime/prod").replace(/^\/+|\/+$/g, "");

/** ECS task secrets from infra/aws/terraform/locals.tf */
const ECS_SSM_KEYS = new Set([
  "JWT_SECRET",
  "DATA_ENCRYPTION_KEY",
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ANTHROPIC_API_KEY",
  "FRONTEND_ORIGIN",
]);

/** Optional SSM names when present in .env.secrets (not used by ECS task def today). */
const EXTRA_SSM_KEYS = new Set(["VERCEL_TOKEN", "SUPABASE_ANON_KEY"]);

function loadDotEnv(path) {
  if (!existsSync(path)) {
    console.error(`Missing ${path}. Create it from the template and fill values.`);
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.replace(/\r/g, "").trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val.trim();
  }
  return out;
}

function requireNonEmpty(env, name) {
  const v = env[name]?.trim();
  if (!v) {
    console.error(`Missing or empty ${name} in .env.secrets`);
    process.exit(1);
  }
  return v;
}

function ssmName(key) {
  return `/${SSM_PREFIX}/${key}`;
}

async function main() {
  const env = loadDotEnv(SECRETS_FILE);

  const accessKeyId = requireNonEmpty(env, "AWS_ACCESS_KEY_ID");
  const secretAccessKey = requireNonEmpty(env, "AWS_SECRET_ACCESS_KEY");

  const vercelToken = requireNonEmpty(env, "VERCEL_TOKEN");
  const stripeSecret = requireNonEmpty(env, "STRIPE_SECRET_KEY");
  const supabaseUrl = requireNonEmpty(env, "SUPABASE_URL");
  const supabaseAnon = requireNonEmpty(env, "SUPABASE_ANON_KEY");
  const jwtSecret = requireNonEmpty(env, "JWT_SECRET");

  const railway =
    env.API_PROXY_TARGET?.trim() ||
    env.RAILWAY_PUBLIC_API_URL?.trim() ||
    env.NEXT_PUBLIC_API_URL?.trim() ||
    process.env.API_PROXY_TARGET?.trim() ||
    process.env.RAILWAY_PUBLIC_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!railway) {
    console.error(
      "Missing backend public URL. Set API_PROXY_TARGET (or RAILWAY_PUBLIC_API_URL or NEXT_PUBLIC_API_URL) in .env.secrets, or export one of those before running.",
    );
    process.exit(1);
  }

  const client = new SSMClient({
    region: AWS_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  /** @type {Array<{ key: string, value: string }>} */
  const toPut = [];
  const seen = new Set();

  function pushParam(key, value) {
    const v = value?.trim();
    if (!v || seen.has(key)) return;
    if (!ECS_SSM_KEYS.has(key) && !EXTRA_SSM_KEYS.has(key)) return;
    seen.add(key);
    toPut.push({ key, value: v });
  }

  pushParam("JWT_SECRET", jwtSecret);
  pushParam("STRIPE_SECRET_KEY", stripeSecret);
  pushParam("SUPABASE_URL", supabaseUrl);
  pushParam("VERCEL_TOKEN", vercelToken);
  pushParam("SUPABASE_ANON_KEY", supabaseAnon);

  for (const k of ECS_SSM_KEYS) {
    if (env[k]?.trim()) pushParam(k, env[k]);
  }

  if (toPut.length === 0) {
    console.error("No SSM parameters to write.");
    process.exit(1);
  }

  for (const { key, value } of toPut) {
    const Name = ssmName(key);
    await client.send(
      new PutParameterCommand({
        Name,
        Value: value,
        Type: "SecureString",
        Overwrite: true,
      }),
    );
    console.log("SSM PutParameter OK:", Name);
  }

  const deploymentBody = [
    "# Generated by scripts/push-secrets-from-env-secrets.mjs — do not commit (gitignored).",
    "",
    `VERCEL_TOKEN=${vercelToken}`,
    "",
    "VERCEL_PROJECT=gametime-web",
    "",
    `API_PROXY_TARGET=${railway.replace(/\/$/, "")}`,
    `NEXT_PUBLIC_API_URL=${railway.replace(/\/$/, "")}`,
    "",
    `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl.replace(/\/$/, "")}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnon}`,
    "",
    `JWT_SECRET=${jwtSecret}`,
    "",
    "VERIFY_AI_PROXY=1",
    "",
  ].join("\n");

  writeFileSync(DEPLOYMENT_FILE, deploymentBody, { mode: 0o600 });
  console.log("Wrote", DEPLOYMENT_FILE);

  const vercel = spawnSync(process.execPath, ["scripts/push-vercel-production.mjs"], {
    cwd: WEB_NEXT,
    encoding: "utf8",
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...process.env },
  });

  if (vercel.status !== 0) {
    console.error("Vercel production script failed; leaving .env.secrets and .env.deployment on disk for retry.");
    process.exit(vercel.status ?? 1);
  }

  unlinkSync(SECRETS_FILE);
  unlinkSync(DEPLOYMENT_FILE);
  console.log("Removed .env.secrets and web-next/.env.deployment (self-destruct after SSM + Vercel).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
