#!/usr/bin/env bash
# Link web-next to Vercel, sync production env vars, deploy to production, print the public URL.
# Prerequisites: npm/npx, VERCEL_TOKEN (https://vercel.com/account/tokens), AWS or Terraform for ALB URL (optional if ALB_HTTP_URL set).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_NEXT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WEB_NEXT"

ENV_FILE="${VERCEL_DEPLOY_ENV_FILE:-$WEB_NEXT/vercel-prod.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "Set VERCEL_TOKEN (Vercel account token). Optional: $ENV_FILE with ALB_HTTP_URL, JWT_SECRET, Supabase keys." >&2
  exit 1
fi

VC=(npx --yes vercel@latest --token "$VERCEL_TOKEN")

if [[ -z "${VERCEL_PROJECT_NAME:-}" ]]; then
  echo "Set VERCEL_PROJECT_NAME to your Vercel project name (create an empty project in the dashboard if needed)." >&2
  exit 1
fi

if [[ -z "${VERCEL_SCOPE:-}" ]]; then
  echo "Set VERCEL_SCOPE to your Vercel team slug or user id (vercel teams ls / vercel whoami)." >&2
  exit 1
fi

ALB_URL="${ALB_HTTP_URL:-}"
if [[ -z "$ALB_URL" ]]; then
  ALB_URL="$("$SCRIPT_DIR/get-alb-http-url.sh")"
fi
ALB_URL="${ALB_URL%/}"
if [[ -z "$ALB_URL" ]]; then
  echo "Could not determine ALB URL. Set ALB_HTTP_URL in $ENV_FILE or ensure Terraform/AWS access works." >&2
  exit 1
fi

for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY JWT_SECRET; do
  eval "val=\${$v:-}"
  if [[ -z "$val" ]]; then
    echo "Missing required $v (set in environment or $ENV_FILE)." >&2
    exit 1
  fi
done

if [[ ! -f "$WEB_NEXT/.vercel/project.json" ]]; then
  "${VC[@]}" link --yes --project "$VERCEL_PROJECT_NAME" --scope "$VERCEL_SCOPE" --cwd "$WEB_NEXT"
fi

add_env() {
  local name="$1" value="$2" sensitive="$3"
  local args=("${VC[@]}" env add "$name" production --cwd "$WEB_NEXT" --scope "$VERCEL_SCOPE" -y --force --value "$value")
  if [[ "$sensitive" == "1" ]]; then
    args+=(--sensitive)
  else
    args+=(--no-sensitive)
  fi
  "${args[@]}"
}

add_env NEXT_PUBLIC_API_URL "$ALB_URL" 0
add_env API_PROXY_TARGET "$ALB_URL" 0
add_env NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL" 0
add_env NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY" 0
add_env JWT_SECRET "$JWT_SECRET" 1

if [[ -n "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  add_env NEXT_PUBLIC_SITE_URL "${NEXT_PUBLIC_SITE_URL%/}" 0
fi

OUT="$("${VC[@]}" deploy --prod --yes --cwd "$WEB_NEXT" --scope "$VERCEL_SCOPE" -F json)"
URL="$(printf '%s' "$OUT" | jq -r '.url // empty')"
if [[ -z "$URL" ]]; then
  echo "$OUT" >&2
  echo "Deploy finished but could not parse .url from JSON output." >&2
  exit 1
fi

echo ""
echo "=== Vercel production deployment URL ==="
echo "$URL"
echo ""
echo "Use this value (origin only, no path) for AWS SSM FRONTEND_ORIGIN, e.g.:"
echo "  $URL"
