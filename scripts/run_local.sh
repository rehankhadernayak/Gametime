#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
. "$ROOT/scripts/load-nvm-if-needed.sh"

cd "$ROOT"
cp -n .env.example .env || true
npm install
npm run dev
