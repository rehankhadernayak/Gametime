#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
. "$ROOT/scripts/load-nvm-if-needed.sh"

cd "$ROOT"

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev
