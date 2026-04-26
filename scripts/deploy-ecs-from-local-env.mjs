#!/usr/bin/env node
/**
 * Local ECS deploy: sync SSM secrets from local env files, build & push image to ECR, register task
 * definition with new image, update ECS service, wait for stable rollout.
 *
 * Reads (later files override): repo `.env`, `.env.secrets`, `backend/.env`
 * Uploads keys from `infra/aws/terraform/locals.tf` → `ssm_secret_names` as SecureString under
 * `/${SSM_PARAMETER_PREFIX}/KEY` (default prefix gametime/prod).
 *
 * If `FRONTEND_ORIGIN` is missing or empty in merged files, uses:
 *   https://gametime-app.org,https://*.vercel.app
 *
 * Sanitization (fixes ERR_INVALID_CHAR on Authorization): trims `AWS_ACCESS_KEY_ID`,
 * `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_PROFILE` in process.env (strip \\r, outer quotes,
 * whitespace). All dotenv values and SSM payloads are trimmed and CR-stripped.
 *
 * Prerequisites: AWS CLI v2, Docker, jq (for register-ecs-task-image.sh), IAM for SSM, ECR, ECS.
 *
 * Env — region & deploy targets (first non-empty wins per group):
 *   AWS_REGION — default ap-southeast-1 or terraform output `aws_region`
 *   ECR_REPOSITORY_URI — full ECR repo URI without tag (main)
 *   DEPLOY_ECR_REPOSITORY_URL — same, alternate name (branch)
 *   ECS_CLUSTER, ECS_SERVICE — cluster & service (main)
 *   DEPLOY_ECS_CLUSTER_NAME / ECS_CLUSTER_NAME, DEPLOY_ECS_SERVICE_NAME / ECS_SERVICE_NAME — alternates
 *   DEPLOY_ECS_TASK_DEFINITION_FAMILY / ECS_TASK_DEFINITION_FAMILY — for register-ecs-task-image.sh
 *   If terraform is on PATH with initialized state in infra/aws/terraform, missing values use outputs.
 *
 * Optional:
 *   SSM_PARAMETER_PREFIX — default gametime/prod
 *   DEPLOY_SKIP_SSM=1 — skip SSM PutParameter
 *   DEPLOY_ENV_FILE — unused; merge always uses .env + .env.secrets + backend/.env
 *   FRONTEND_ORIGIN — overrides merged env for SSM `FRONTEND_ORIGIN` only
 *   IMAGE_TAG — default local-<timestamp>; image also tagged :latest
 *   USE_SUDO_DOCKER=1 — prefix docker with sudo
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PutParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const TF_DIR = join(REPO_ROOT, "infra", "aws", "terraform");

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

function stripOuterQuotes(val) {
  let v = val;
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function scrub(s) {
  return String(s ?? "")
    .replace(/\r/g, "")
    .trim();
}

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.replace(/\r/g, "").trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = scrub(t.slice(i + 1));
    val = scrub(stripOuterQuotes(val));
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

function tryTerraformOutput(name) {
  const r = spawnSync(
    "terraform",
    ["-chdir=" + TF_DIR, "output", "-raw", name],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return null;
  const v = scrub(r.stdout);
  return v || null;
}

function requireStr(label, val) {
  const v = scrub(val);
  if (!v) {
    console.error(
      `Missing ${label}. Set env vars (see script header), or run Terraform in ${TF_DIR} so outputs are available.`,
    );
    process.exit(1);
  }
  return v;
}

function resolveDeployTargets() {
  const regionFromTf = tryTerraformOutput("aws_region");
  const region =
    scrub(process.env.AWS_REGION) || scrub(regionFromTf) || "ap-southeast-1";

  const ecrRepoUrl =
    scrub(process.env.DEPLOY_ECR_REPOSITORY_URL) ||
    scrub(process.env.ECR_REPOSITORY_URI) ||
    tryTerraformOutput("ecr_repository_url");

  const cluster =
    scrub(process.env.DEPLOY_ECS_CLUSTER_NAME) ||
    scrub(process.env.ECS_CLUSTER_NAME) ||
    scrub(process.env.ECS_CLUSTER) ||
    tryTerraformOutput("ecs_cluster_name");

  const service =
    scrub(process.env.DEPLOY_ECS_SERVICE_NAME) ||
    scrub(process.env.ECS_SERVICE_NAME) ||
    scrub(process.env.ECS_SERVICE) ||
    tryTerraformOutput("ecs_service_name");

  const taskFamily =
    scrub(process.env.DEPLOY_ECS_TASK_DEFINITION_FAMILY) ||
    scrub(process.env.ECS_TASK_DEFINITION_FAMILY) ||
    tryTerraformOutput("ecs_task_definition_family");

  return {
    region,
    ecrRepoUrl: requireStr(
      "ECR_REPOSITORY_URI or DEPLOY_ECR_REPOSITORY_URL (or terraform output ecr_repository_url)",
      ecrRepoUrl,
    ),
    cluster: requireStr(
      "ECS_CLUSTER or DEPLOY_ECS_CLUSTER_NAME (or terraform output ecs_cluster_name)",
      cluster,
    ),
    service: requireStr(
      "ECS_SERVICE or DEPLOY_ECS_SERVICE_NAME (or terraform output ecs_service_name)",
      service,
    ),
    taskFamily: requireStr(
      "DEPLOY_ECS_TASK_DEFINITION_FAMILY or ECS_TASK_DEFINITION_FAMILY (or terraform output ecs_task_definition_family)",
      taskFamily,
    ),
  };
}

function dockerCmd(binary, args, opts = {}) {
  const useSudo = process.env.USE_SUDO_DOCKER === "1";
  const cmd = useSudo ? "sudo" : binary;
  const argv = useSudo ? [binary, ...args] : args;
  return spawnSync(cmd, argv, { encoding: "utf8", ...opts });
}

function runInherit(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function trimAwsCredentialEnv() {
  for (const k of [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
    "AWS_PROFILE",
  ]) {
    const v = process.env[k];
    if (v == null || v === "") continue;
    process.env[k] = scrub(stripOuterQuotes(scrub(v)));
  }
}

async function syncSsm(client, merged) {
  /** @type {Record<string, string>} */
  const ssmValues = {};
  for (const key of SSM_KEYS) {
    if (key === "FRONTEND_ORIGIN") {
      const fromOverride = scrub(
        process.env.FRONTEND_ORIGIN ?? merged.FRONTEND_ORIGIN,
      );
      ssmValues[key] = fromOverride || DEFAULT_FRONTEND_ORIGIN;
      continue;
    }
    const v = scrub(merged[key]);
    if (!v) {
      console.error(
        `Missing non-empty ${key} in .env, .env.secrets, or backend/.env (see infra/aws/terraform/locals.tf).`,
      );
      process.exit(1);
    }
    ssmValues[key] = v;
  }

  const ssmPrefix = (process.env.SSM_PARAMETER_PREFIX || "gametime/prod").replace(
    /^\/+|\/+$/g,
    "",
  );
  for (const key of SSM_KEYS) {
    const Name = `/${ssmPrefix}/${key}`;
    await client.send(
      new PutParameterCommand({
        Name,
        Value: ssmValues[key],
        Type: "SecureString",
        Overwrite: true,
      }),
    );
    console.log("SSM PutParameter OK:", Name);
  }
}

async function main() {
  trimAwsCredentialEnv();

  const merged = loadMergedLocalEnv();
  const { region, ecrRepoUrl, cluster, service, taskFamily } = resolveDeployTargets();
  process.env.AWS_REGION = region;

  if (process.env.DEPLOY_SKIP_SSM !== "1") {
    console.log("==> SSM sync (trimmed values from .env / .env.secrets / backend/.env)…");
    const client = new SSMClient({ region });
    await syncSsm(client, merged);
  } else {
    console.log("==> Skipping SSM (DEPLOY_SKIP_SSM=1)");
  }

  const registryHost = ecrRepoUrl.split("/")[0];
  const loginPw = spawnSync(
    "aws",
    ["ecr", "get-login-password", "--region", region],
    { encoding: "utf8" },
  );
  if (loginPw.status !== 0) {
    console.error(loginPw.stderr || "aws ecr get-login-password failed");
    process.exit(loginPw.status ?? 1);
  }

  console.log("==> ECR login…");
  const dLogin = dockerCmd(
    "docker",
    ["login", "--username", "AWS", "--password-stdin", registryHost],
    {
      input: scrub(loginPw.stdout),
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (dLogin.status !== 0) {
    console.error(dLogin.stderr || "docker login failed");
    process.exit(dLogin.status ?? 1);
  }

  const imageTag = scrub(process.env.IMAGE_TAG) || `local-${Date.now()}`;
  const imageUriTagged = `${ecrRepoUrl}:${imageTag}`;
  const imageUriLatest = `${ecrRepoUrl}:latest`;

  console.log("==> docker build…", imageUriTagged, imageUriLatest);
  const build = dockerCmd(
    "docker",
    [
      "build",
      "-f",
      "Dockerfile.railway",
      "-t",
      imageUriTagged,
      "-t",
      imageUriLatest,
      ".",
    ],
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);

  console.log("==> docker push…");
  const push1 = dockerCmd("docker", ["push", imageUriTagged], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (push1.status !== 0) process.exit(push1.status ?? 1);
  const push2 = dockerCmd("docker", ["push", imageUriLatest], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (push2.status !== 0) process.exit(push2.status ?? 1);

  const regScript = join(REPO_ROOT, "infra", "aws", "scripts", "register-ecs-task-image.sh");
  runInherit("chmod", ["+x", regScript]);

  console.log("==> Register task definition + ECS update…");
  const reg = spawnSync("bash", [regScript, taskFamily, imageUriTagged], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (reg.status !== 0) process.exit(reg.status ?? 1);
  const tdArn = scrub(reg.stdout);
  if (!tdArn) {
    console.error("register-ecs-task-image.sh produced no task definition ARN");
    process.exit(1);
  }

  runInherit(
    "aws",
    [
      "ecs",
      "update-service",
      "--cluster",
      cluster,
      "--service",
      service,
      "--task-definition",
      tdArn,
      "--region",
      region,
    ],
  );

  console.log("==> Waiting for service stable…");
  runInherit("aws", [
    "ecs",
    "wait",
    "services-stable",
    "--cluster",
    cluster,
    "--services",
    service,
    "--region",
    region,
  ]);

  console.log("==> Deploy complete. Task definition:", tdArn);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
