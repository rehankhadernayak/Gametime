#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Checking required tools..."

check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo "ERROR: '$1' is not installed or not in PATH."
        exit 1
    fi
    echo "    $1 OK"
}

check_tool node
check_tool docker

if ! docker compose version &> /dev/null; then
    echo "ERROR: 'docker compose' (v2 plugin) is not available."
    exit 1
fi
echo "    docker compose OK"

echo ""
echo "==> Creating data/ directory for SQLite..."
mkdir -p "$REPO_ROOT/data"
echo "    $REPO_ROOT/data created"

echo ""
echo "==> Checking backend/.env..."
ENV_FILE="$REPO_ROOT/backend/.env"
ENV_EXAMPLE="$REPO_ROOT/backend/.env.example"

if [ -f "$ENV_FILE" ]; then
    echo "    backend/.env already exists — skipping copy"
else
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "    Copied .env.example → backend/.env"
fi

echo ""
echo "Setup complete."
echo ""
echo "NEXT STEPS:"
echo "  1. Edit backend/.env and fill in all required values:"
echo "       JWT_SECRET         — generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo "       DATA_ENCRYPTION_KEY — same command as above"
echo "       ANTHROPIC_API_KEY  — https://console.anthropic.com"
echo "       FRONTEND_ORIGIN    — your production domain (e.g. https://gametime.example.com)"
echo "       SMTP_* or RESEND_API_KEY — for email delivery"
echo "       STRIPE_*           — for GP top-up payments"
echo "  2. Run: bash scripts/deploy.sh"
