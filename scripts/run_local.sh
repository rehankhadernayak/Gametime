#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
cp -n .env.example .env || true
npm install
npm run dev
