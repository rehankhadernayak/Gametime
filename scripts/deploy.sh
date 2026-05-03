#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. "$REPO_ROOT/scripts/load-nvm-if-needed.sh"

echo "==> [1/4] Pulling latest code..."
git -C "$REPO_ROOT" pull

echo "==> [2/4] Building frontend..."
cd "$REPO_ROOT/frontend"
npm ci
npx vite build

echo "==> [3/4] Building and restarting backend..."
cd "$REPO_ROOT"
docker compose build backend
docker compose up -d

echo "==> [4/4] Health check..."
sleep 3
if curl -fsS http://localhost/health > /dev/null; then
    echo ""
    echo "Deployment successful. Gametime is running."
else
    echo ""
    echo "ERROR: Health check failed. Check logs with: docker compose logs backend"
    exit 1
fi
