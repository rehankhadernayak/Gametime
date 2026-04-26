#!/usr/bin/env node
/**
 * Local ECS deploy: optional SSM sync from .env → ECR build/push → register task def → ECS update.
 *
 * Prereqs: AWS CLI, Docker, jq, credentials configured (env or ~/.aws).
 * Terraform optional: if `terraform` is on PATH and state is initialized, outputs fill ECR/ECS names.
 *   Otherwise set DEPLOY_ECR_REPOSITORY_URL, DEPLOY_ECS_CLUSTER_NAME, DEPLOY_ECS_SERVICE_NAME,
 *   DEPLOY_ECS_TASK_DEFINITION_FAMILY (and AWS_REGION if not in env).
 *
 * Sanitization: trims AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN in process.env
 * (fixes ERR_INVALID_CHAR in Authorization from stray \\n, \\r, spaces, or quotes).
 * All SSM parameter values are trimmed (and CR stripped from line ends) before PutParameter.
 *
 * Env:
 *   AWS_REGION — default from terraform output or ap-southeast-1
 *   SSM_PARAMETER_PREFIX — default gametime/prod (must match Terraform var.ssm_parameter_prefix)
 *   DEPLOY_ENV_FILE — dotenv path for SSM sync (default: repo-root .env). Set DEPLOY_SKIP_SSM=1 to skip SSM.
 *   DEPLOY_ECR_REPOSITORY_URL — e.g. 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/gametime-prod-app
 *   DEPLOY_ECS_CLUSTER_NAME, DEPLOY_ECS_SERVICE_NAME, DEPLOY_ECS_TASK_DEFINITION_FAMILY — or ECS_* aliases
 *
 * Quick credential check (no secrets printed):
 *   node -e "const k=['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY'];for(const x of k){const v=process.env[x]||'';console.log(x,'len',v.length,'badChars',/[^A-Za-z0-9/+_=\\-]/.test(v)?'maybe':'ok');}"
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const TF_DIR = join(REPO_ROOT, "infra", "aws", "terraform");

/** Same keys as infra/aws/terraform/locals.tf ssm_secret_names */
const ECS_SSM_KEYS = [
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

/** Load KEY=VAL lines; trim keys/values; strip \\r; trim again after unquoting. */
function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.replace(/\r/g, "").trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    val = stripOuterQuotes(val).trim();
    out[key] = val;
  }
  return out;
}

function tryTerraformOutput(name) {
  const r = spawnSync(
    "terraform",
    ["-chdir=" + TF_DIR, "output", "-raw", name],
    { encoding: "utf8" },
  );
  if (r.status !== 0) return null;
  const v = (r.stdout || "").replace(/\r/g, "").trim();
  return v || null;
}

function requireStr(label, val) {
  const v = (val == null ? "" : String(val)).replace(/\r/g, "").trim();
  if (!v) {
    console.error(
      `Missing ${label}. Run Terraform in ${TF_DIR} (terraform init && apply) or export the DEPLOY_* / ECS_* variables documented in this script's header.`,
    );
    process.exit(1);
  }
  return v;
}

function resolveDeployTargets() {
  const regionFromTf = tryTerraformOutput("aws_region");
  const region =
    (process.env.AWS_REGION || "").replace(/\r/g, "").trim() ||
    (regionFromTf || "").trim() ||
    "ap-southeast-1";

  const ecrRepoUrl =
    (process.env.DEPLOY_ECR_REPOSITORY_URL || "").replace(/\r/g, "").trim() ||
    tryTerraformOutput("ecr_repository_url");

  const cluster =
    (
      process.env.DEPLOY_ECS_CLUSTER_NAME ||
      process.env.ECS_CLUSTER_NAME ||
      ""
    )
      .replace(/\r/g, "")
      .trim() || tryTerraformOutput("ecs_cluster_name");

  const service =
    (
      process.env.DEPLOY_ECS_SERVICE_NAME ||
      process.env.ECS_SERVICE_NAME ||
      ""
    )
      .replace(/\r/g, "")
      .trim() || tryTerraformOutput("ecs_service_name");

  const taskFamily =
    (
      process.env.DEPLOY_ECS_TASK_DEFINITION_FAMILY ||
      process.env.ECS_TASK_DEFINITION_FAMILY ||
      ""
    )
      .replace(/\r/g, "")
      .trim() || tryTerraformOutput("ecs_task_definition_family");

  return {
    region,
    ecrRepoUrl: requireStr(
      "DEPLOY_ECR_REPOSITORY_URL (or terraform output ecr_repository_url)",
      ecrRepoUrl,
    ),
    cluster: requireStr(
      "DEPLOY_ECS_CLUSTER_NAME (or terraform output ecs_cluster_name)",
      cluster,
    ),
    service: requireStr(
      "DEPLOY_ECS_SERVICE_NAME (or terraform output ecs_service_name)",
      service,
    ),
    taskFamily: requireStr(
      "DEPLOY_ECS_TASK_DEFINITION_FAMILY (or terraform output ecs_task_definition_family)",
      taskFamily,
    ),
  };
}

function run(cmd, args, opts = {}) {
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
    let t = String(v).replace(/\r/g, "").trim();
    t = stripOuterQuotes(t).trim();
    process.env[k] = t;
  }
}

function ssmPrefix() {
  return (process.env.SSM_PARAMETER_PREFIX || "gametime/prod").replace(/^\/+|\/+$/g, "");
}

function ssmName(key) {
  return `/${ssmPrefix()}/${key}`;
}

async function syncSsmFromEnv(client) {
  const envPath =
    process.env.DEPLOY_ENV_FILE || join(REPO_ROOT, ".env");
  const fileEnv = loadDotEnv(envPath);
  const merged = { ...process.env, ...fileEnv };

  let n = 0;
  for (const key of ECS_SSM_KEYS) {
    const raw = merged[key];
    if (raw == null || String(raw).trim() === "") continue;
    const value = String(raw).replace(/\r/g, "").trim();
    if (!value) continue;
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
    n++;
  }
  if (n === 0) {
    console.log(
      "SSM: no keys from",
      envPath,
      "(and process.env) matched non-empty ECS_SSM_KEYS; skipping PutParameter calls.",
    );
  }
}

async function main() {
  trimAwsCredentialEnv();

  const { region, ecrRepoUrl, cluster, service, taskFamily } = resolveDeployTargets();
  process.env.AWS_REGION = region;

  if (process.env.DEPLOY_SKIP_SSM !== "1") {
    const client = new SSMClient({ region });
    console.log("==> SSM sync (trimmed values)…");
    await syncSsmFromEnv(client);
  } else {
    console.log("==> Skipping SSM (DEPLOY_SKIP_SSM=1)");
  }

  const registry = ecrRepoUrl.split("/")[0];
  const imageTag = process.env.IMAGE_TAG?.trim() || `local-${Date.now()}`;
  const imageUriTagged = `${ecrRepoUrl}:${imageTag}`;
  const imageUriLatest = `${ecrRepoUrl}:latest`;

  console.log("==> ECR login…");
  const login = spawnSync(
    "aws",
    ["ecr", "get-login-password", "--region", region],
    { encoding: "utf8" },
  );
  if (login.status !== 0) {
    console.error(login.stderr);
    process.exit(login.status ?? 1);
  }
  const pw = login.stdout.trim();
  run("docker", ["login", "--username", "AWS", "--password-stdin", registry], {
    input: pw,
    stdio: ["pipe", "inherit", "inherit"],
  });

  console.log("==> docker build…");
  run("docker", [
    "build",
    "-f",
    "Dockerfile.railway",
    "-t",
    imageUriTagged,
    "-t",
    imageUriLatest,
    ".",
  ], { cwd: REPO_ROOT });

  console.log("==> docker push…");
  run("docker", ["push", imageUriTagged], { cwd: REPO_ROOT });
  run("docker", ["push", imageUriLatest], { cwd: REPO_ROOT });

  const regScript = join(REPO_ROOT, "infra", "aws", "scripts", "register-ecs-task-image.sh");
  run("chmod", ["+x", regScript]);
  console.log("==> register task definition + ECS update…");
  const reg = spawnSync("bash", [regScript, taskFamily, imageUriTagged], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (reg.status !== 0) process.exit(reg.status ?? 1);
  const tdArn = (reg.stdout || "").trim();
  if (!tdArn) {
    console.error("register-ecs-task-image.sh produced no task definition ARN");
    process.exit(1);
  }

  run("aws", [
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
  ]);

  console.log("==> Deploy complete. Task definition:", tdArn);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
