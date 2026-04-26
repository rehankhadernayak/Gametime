#!/usr/bin/env bash
# Print the live Application Load Balancer HTTP origin: http://<dns>
# 1) Terraform output alb_dns_name when state exists under infra/aws/terraform
# 2) Else AWS ELBv2 describe-load-balancers by name (default: gametime-prod-alb)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="$ROOT/infra/aws/terraform"
ALB_NAME="${ALB_NAME:-gametime-prod-alb}"

normalize_origin() {
  local raw="$1"
  raw="${raw//$'\r'/}"
  raw="${raw// /}"
  [[ -n "$raw" ]] || return 1
  case "$raw" in
    http://*|https://*) printf '%s\n' "$raw" ;;
    *) printf 'http://%s\n' "$raw" ;;
  esac
}

host=""
if command -v terraform >/dev/null 2>&1; then
  if [[ -f "$TF_DIR/terraform.tfstate" || -f "$TF_DIR/.terraform/terraform.tfstate" ]]; then
    host="$(cd "$TF_DIR" && terraform output -raw alb_dns_name 2>/dev/null)" || host=""
  fi
fi

if [[ -z "$host" ]]; then
  command -v aws >/dev/null 2>&1 || {
    echo "No Terraform state in $TF_DIR and aws CLI not found. Configure AWS credentials or run terraform apply locally." >&2
    exit 1
  }
  host="$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --query 'LoadBalancers[0].DNSName' --output text 2>/dev/null || true)"
  if [[ -z "$host" || "$host" == "None" ]]; then
    echo "Could not get ALB DNS (name: $ALB_NAME). Set ALB_NAME or use Terraform in $TF_DIR." >&2
    exit 1
  fi
fi

normalize_origin "$host"
