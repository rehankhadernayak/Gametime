#!/usr/bin/env bash
set -euo pipefail

mkdir -p Gametime/{backend/src/{config,db,middleware,services,controllers,routes,utils,jobs},backend/tests,frontend/src/{api,components,pages,styles},scripts}

touch Gametime/package.json Gametime/.env.example Gametime/start.sh
touch Gametime/backend/package.json Gametime/backend/vitest.config.js
touch Gametime/frontend/package.json Gametime/frontend/vite.config.js Gametime/frontend/index.html

echo "Folder and file skeleton created."
