#!/usr/bin/env bash
# Idempotent dependency install for Cursor Cloud Agent / environment.json "install" step.
# Runs from repo root; safe to run on every agent boot.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
. "$ROOT/scripts/load-nvm-if-needed.sh"

if ! command -v npm >/dev/null 2>&1; then
  echo "cursor-environment-install: npm still not on PATH after nvm/fnm/volta and bundled Node bootstrap." >&2
  exit 1
fi

npm install

for pkg in backend frontend mobile web-next; do
  if [ -f "$pkg/package.json" ]; then
    (cd "$pkg" && npm install)
  fi
done
