#!/usr/bin/env node
/**
 * One-shot: sync ECS SSM secrets from local env files, build & push :latest to ECR, force ECS rollout.
 *
 * Reads (in order; later files override): repo `.env`, `.env.secrets`, `backend/.env`
 * Uploads every key from `infra/aws/terraform/locals.tf` → `ssm_secret_names` as SecureString
 * under `/${SSM_PARAMETER_PREFIX}/KEY` (default prefix gametime/prod).
 *
 * If `FRONTEND_ORIGIN` is missing or empty in those files, uses:
 *   https://gametime-app.org,https://*.vercel.app
 *
 * Prerequisites: AWS CLI v2, Docker, IAM permission for SSM PutParameter, ECR push, ECS UpdateService.
 * Credentials: default chain (env vars, ~/.aws/credentials, SSO profile, etc.).
 *
 * Env overrides:
 *   AWS_REGION — default ap-southeast-1
 *   SSM_PARAMETER_PREFIX — default gametime/prod (no leading slash)
 *   ECR_REPOSITORY_URI — full repo URI without tag
 *   ECS_CLUSTER, ECS_SERVICE
 *   FRONTEND_ORIGIN — optional; overrides merged env for SSM only
 *   USE_SUDO_DOCKER=1 — prefix docker with sudo
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const REGION = process.env.AWS_REGION || "ap-southeast-1";
const SSM_PREFIX = (process.env.SSM_PARAMETER_PREFIX || "gametime/prod").replace(/^\/+|\/+$/g, "");
const ECR_URI =
  process.env.ECR_REPOSITORY_URI ||
  "306667525938.dkr.ecr.ap-southeast-1.amazonaws.com/gametime-prod-app";
const CLUSTER = process.env.ECS_CLUSTER || "gametime-prod-cluster";
const SERVICE = process.env.ECS_SERVICE || "gametime-prod-svc";

const DEFAULT_FRONTEND_ORIGIN = "https://gametime-app.org,https://*.vercel.app";

/** Must match infra/aws/terraform/locals.tf ssm_secret_names */
const SSM_KEYS = [
  "JWT_SECRET",
  "DATA_ENCRYPTION_KEY",
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ANTHROPIC_API_KEY",
  "FRONTEND_ORIGIN",
];

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
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

function loadMergedLocalEnv() {
  const paths = [
    join(REPO_ROOT, ".env"),
    join(REPO_ROOT, ".env.secrets"),
    join(REPO_ROOT, "backend", ".env"),
  ];
  const merged = {};
  for (const p of paths) {
    if (!existsSync(p)) continue;
    Object.assign(merged, parseDotEnv(readFileSync(p, "utf8")));
  }
  return merged;
}

function dockerCmd(binary, args, opts = {}) {
  const useSudo = process.env.USE_SUDO_DOCKER === "1";
  const cmd = useSudo ? "sudo" : binary;
  const argv = useSudo ? [binary, ...args] : args;
  return spawnSync(cmd, argv, { encoding: "utf8", ...opts });
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (r.status !== 0) {
    const err = r.stderr || r.stdout || `exit ${r.status}`;
    throw new Error(`${cmd} ${args.join(" ")} failed: ${err}`);
  }
  return r;
}

async function main() {
  const merged = loadMergedLocalEnv();

  /** @type {Record<string, string>} */
  const ssmValues = {};
  for (const key of SSM_KEYS) {
    if (key === "FRONTEND_ORIGIN") {
      const fromEnv = process.env.FRONTEND_ORIGIN?.trim() || merged.FRONTEND_ORIGIN?.trim();
      ssmValues[key] = fromEnv || DEFAULT_FRONTEND_ORIGIN;
      continue;
    }
    const v = merged[key]?.trim();
    if (!v) {
      console.error(
        `Missing non-empty ${key} in .env, .env.secrets, or backend/.env (see infra/aws/terraform/outputs.tf ssm_parameter_names).`,
      );
      process.exit(1);
    }
    ssmValues[key] = v;
  }

  const ssm = new SSMClient({ region: REGION });
  for (const key of SSM_KEYS) {
    const Name = `/${SSM_PREFIX}/${key}`;
    await ssm.send(
      new PutParameterCommand({
        Name,
        Value: ssmValues[key],
        Type: "SecureString",
        Overwrite: true,
      }),
    );
    console.log("SSM PutParameter OK:", Name);
  }

  const registryHost = ECR_URI.split("/")[0];
  const pw = run("aws", ["ecr", "get-login-password", "--region", REGION], {
    maxBuffer: 10 * 1024 * 1024,
  });
  const login = dockerCmd(
    "docker",
    ["login", "--username", "AWS", "--password-stdin", registryHost],
    { input: pw.stdout, stdio: ["pipe", "inherit", "inherit"] },
  );
  if (login.status !== 0) {
    console.error(login.stderr || "docker login failed");
    process.exit(login.status ?? 1);
  }

  const tag = `${ECR_URI}:latest`;
  console.log("Building", tag);
  const build = dockerCmd("docker", ["build", "-f", "Dockerfile", "-t", tag, "."], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);

  console.log("Pushing", tag);
  const push = dockerCmd("docker", ["push", tag], { cwd: REPO_ROOT, stdio: "inherit" });
  if (push.status !== 0) process.exit(push.status ?? 1);

  console.log("Forcing new deployment:", CLUSTER, SERVICE);
  run("aws", ["ecs", "update-service", "--cluster", CLUSTER, "--service", SERVICE, "--force-new-deployment", "--region", REGION], {
    stdio: "inherit",
  });

  console.log("Waiting for service stable (tasks RUNNING)…");
  run("aws", ["ecs", "wait", "services-stable", "--cluster", CLUSTER, "--services", SERVICE, "--region", REGION], {
    stdio: "inherit",
  });
  console.log("Rollout complete: service stable.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
