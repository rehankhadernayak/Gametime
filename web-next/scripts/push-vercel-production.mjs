#!/usr/bin/env node
/**
 * Non-interactive Vercel production setup for CI/agents.
 *
 * Prerequisites:
 *   - Create a Vercel token: https://vercel.com/account/tokens
 *   - Copy web-next/.env.deployment.example → web-next/.env.deployment and fill values (file is gitignored).
 *
 * Usage (from repo root or web-next):
 *   node scripts/push-vercel-production.mjs
 *
 * Does: cp -a ../frontend → ./frontend (Vercel CLI only uploads web-next/) → vercel link →
 *       vercel deploy --prod with -b/-e (avoids slow/hanging `vercel env add` in CI).
 * Optional post-check: VERIFY_AI_PROXY=1 hits /api/ai/chat (expect 401 when unauthenticated).
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_NEXT = join(__dirname, "..");
const ENV_FILE = join(WEB_NEXT, ".env.deployment");
const BUNDLED_FRONTEND = join(WEB_NEXT, "frontend");
const MONOREPO_FRONTEND = join(WEB_NEXT, "..", "frontend");

/** Vercel only uploads `web-next/`; mirror sibling `frontend/` so @gametime/frontend resolves on the builder. */
function syncBundledFrontend() {
  if (!existsSync(MONOREPO_FRONTEND)) {
    console.error(`Expected monorepo frontend at ${MONOREPO_FRONTEND}`);
    process.exit(1);
  }
  try {
    rmSync(BUNDLED_FRONTEND, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  const r = spawnSync("cp", ["-a", MONOREPO_FRONTEND, BUNDLED_FRONTEND], {
    cwd: WEB_NEXT,
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || "cp -a failed copying ../frontend into web-next/frontend");
    process.exit(r.status ?? 1);
  }
}

function loadDotEnv(path) {
  if (!existsSync(path)) {
    console.error(`Missing ${path}. Copy .env.deployment.example and fill secrets.`);
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
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
    out[key] = val;
  }
  return out;
}

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: WEB_NEXT,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    stdio: ["inherit", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `${cmd} failed`);
    process.exit(r.status ?? 1);
  }
  return (r.stdout || "").trim();
}

function runVercel(args, extraEnv = {}) {
  return run("npx", ["vercel", ...args], extraEnv);
}

function requireKey(env, name) {
  const v = env[name];
  if (!v) {
    console.error(`Missing required ${name} in .env.deployment`);
    process.exit(1);
  }
  return v;
}

const fileEnv = loadDotEnv(ENV_FILE);
const token = requireKey(fileEnv, "VERCEL_TOKEN");
const scope = fileEnv.VERCEL_SCOPE?.trim();
const project = fileEnv.VERCEL_PROJECT?.trim() || "gametime-web";

const railway =
  fileEnv.API_PROXY_TARGET?.trim() ||
  fileEnv.RAILWAY_API_URL?.trim() ||
  fileEnv.NEXT_PUBLIC_API_URL?.trim();
const apiPublic = fileEnv.NEXT_PUBLIC_API_URL?.trim() || railway;
const supabaseUrl = requireKey(fileEnv, "NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnon = requireKey(fileEnv, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
const jwtSecret = requireKey(fileEnv, "JWT_SECRET");

if (!railway) {
  console.error("Set API_PROXY_TARGET or RAILWAY_API_URL or NEXT_PUBLIC_API_URL in .env.deployment");
  process.exit(1);
}

syncBundledFrontend();

const vercelEnv = { VERCEL_TOKEN: token };
const linkArgs = ["link", "--yes", "--project", project];
if (scope) linkArgs.push("--scope", scope);
runVercel(linkArgs, vercelEnv);

const r0 = railway.replace(/\/$/, "");
const api0 = apiPublic.replace(/\/$/, "");
const sup0 = supabaseUrl.replace(/\/$/, "");

/** Build- and run-time env for this deployment (dashboard env vars unchanged). */
const envPairs = [
  ["API_PROXY_TARGET", r0],
  ["NEXT_PUBLIC_API_URL", api0],
  ["NEXT_PUBLIC_SUPABASE_URL", sup0],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnon],
  ["JWT_SECRET", jwtSecret],
];
if (fileEnv.NEXT_PUBLIC_SITE_URL?.trim()) {
  envPairs.push(["NEXT_PUBLIC_SITE_URL", fileEnv.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "")]);
}

const deployArgs = ["deploy", "--prod", "--yes", "--format", "json"];
for (const [k, v] of envPairs) {
  deployArgs.push("-b", `${k}=${v}`, "-e", `${k}=${v}`);
}
if (scope) deployArgs.push("--scope", scope);

const jsonOut = runVercel(deployArgs, vercelEnv);
let url = null;
try {
  const parsed = JSON.parse(jsonOut);
  url =
    parsed.url ||
    parsed.alias?.[0] ||
    parsed.deployment?.url ||
    null;
} catch {
  console.error("Could not parse deploy JSON:", jsonOut.slice(0, 500));
  process.exit(1);
}

if (!url) {
  console.error("Deploy output had no url:", jsonOut.slice(0, 800));
  process.exit(1);
}

const origin = url.startsWith("http") ? url : `https://${url}`;
console.log("Production URL:", origin);

if (process.env.VERIFY_AI_PROXY === "1" || fileEnv.VERIFY_AI_PROXY === "1") {
  const check = spawnSync(
    "curl",
    ["-sS", "-o", "/dev/null", "-w", "%{http_code}", "-X", "POST", `${origin}/api/ai/chat`],
    { encoding: "utf8" },
  );
  const code = (check.stdout || "").trim();
  if (code === "401") {
    console.log("VERIFY_AI_PROXY: POST /api/ai/chat → 401 (expected without Bearer). Edge proxy OK.");
  } else {
    console.error(`VERIFY_AI_PROXY: expected 401, got HTTP ${code}. Check deployment and env.`);
    process.exit(1);
  }
}
