#!/usr/bin/env bash
# Update FRONTEND_ORIGIN in SSM and force a new ECS deployment so tasks reload secrets.
# Preserves the existing parameter type (String vs SecureString) when overwriting.
#
# Env overrides:
#   AWS_REGION, PROJECT_NAME, ENVIRONMENT — must match infra/aws/terraform defaults
#   SSM_FRONTEND_ORIGIN_PARAM — full parameter name (default /gametime/prod/FRONTEND_ORIGIN)
#   FRONTEND_ORIGIN_VALUE — comma-separated origins (default includes Vercel wildcard)
#
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
PROJECT="${PROJECT_NAME:-gametime}"
ENV="${ENVIRONMENT:-prod}"
PARAM_NAME="${SSM_FRONTEND_ORIGIN_PARAM:-/gametime/prod/FRONTEND_ORIGIN}"
VALUE="${FRONTEND_ORIGIN_VALUE:-https://gametime-app.org,https://*.vercel.app}"
CLUSTER="${ECS_CLUSTER:-${PROJECT}-${ENV}-cluster}"
SERVICE="${ECS_SERVICE:-${PROJECT}-${ENV}-svc}"

echo "==> Region: $REGION"
echo "==> SSM:   $PARAM_NAME"
echo "==> ECS:   cluster=$CLUSTER service=$SERVICE"

put_param() {
  local typ="$1"
  if aws ssm get-parameter --name "$PARAM_NAME" --region "$REGION" &>/dev/null; then
    aws ssm put-parameter \
      --name "$PARAM_NAME" \
      --type "$typ" \
      --value "$VALUE" \
      --overwrite \
      --region "$REGION" \
      --no-cli-pager
    echo "==> SSM PutParameter OK (type=$typ, overwrite)"
  else
    aws ssm put-parameter \
      --name "$PARAM_NAME" \
      --type "$typ" \
      --value "$VALUE" \
      --region "$REGION" \
      --no-cli-pager
    echo "==> SSM PutParameter OK (type=$typ, created)"
  fi
}

if aws ssm get-parameter --name "$PARAM_NAME" --region "$REGION" &>/dev/null; then
  CURRENT_TYPE="$(aws ssm get-parameter --name "$PARAM_NAME" --region "$REGION" --query 'Parameter.Type' --output text)"
  echo "==> Existing parameter type: $CURRENT_TYPE"
  put_param "$CURRENT_TYPE"
else
  echo "==> No existing parameter; creating as String (requested)"
  put_param "String"
fi

echo "==> Forcing new ECS deployment (tasks will fetch fresh SSM on start)..."
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment \
  --region "$REGION" \
  --no-cli-pager \
  --query 'service.{status:status,running:runningCount,desired:desiredCount,deployments:deployments[*].{status:status,rollout:rolloutState}}' \
  --output json

echo "==> Waiting for service to stabilize (may take several minutes)..."
aws ecs wait services-stable --cluster "$CLUSTER" --services "$SERVICE" --region "$REGION"
echo "==> ECS service is stable. Backend rollout complete."
