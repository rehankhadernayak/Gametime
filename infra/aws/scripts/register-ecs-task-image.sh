#!/usr/bin/env bash
# Register a new ECS task definition revision identical to the current one except the app image URI.
# Usage: register-ecs-task-image.sh <task-definition-family> <full-image-uri>
set -euo pipefail

FAMILY="${1:?task definition family}"
IMAGE_URI="${2:?full ECR image URI including tag}"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

aws ecs describe-task-definition \
  --task-definition "$FAMILY" \
  --query 'taskDefinition' \
  --output json >"$TMP"

jq --arg IMG "$IMAGE_URI" '
  del(
    .taskDefinitionArn,
    .revision,
    .status,
    .requiresAttributes,
    .compatibilities,
    .registeredAt,
    .registeredBy,
    .deregisteredAt
  )
  | .containerDefinitions |= map(if .name == "app" then .image = $IMG else . end)
' <"$TMP" | aws ecs register-task-definition --cli-input-json file:///dev/stdin \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text
