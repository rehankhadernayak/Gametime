#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck disable=SC1091
. "$ROOT_DIR/scripts/load-nvm-if-needed.sh"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
BACKEND_STARTED_BY_CHECK=0
BACKEND_PID=""

ok() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "[OK] $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "[FAIL] $1"
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  echo "[WARN] $1"
}

cleanup() {
  if [ "$BACKEND_STARTED_BY_CHECK" -eq 1 ] && [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

if command -v rg >/dev/null 2>&1; then
  if rg -n '<<<<<<<|=======|>>>>>>>' backend/src frontend/src mobile/src backend/tests >/tmp/gametime_merge_markers.txt 2>/dev/null; then
    fail "Merge markers found"
    cat /tmp/gametime_merge_markers.txt
  else
    ok "No merge markers detected"
  fi
else
  warn "rg not found; skipped merge-marker scan"
fi

if command -v python3 >/dev/null 2>&1; then
  if python3 - <<'PY'
import pathlib
import re
import sys

root = pathlib.Path('.').resolve()
files = [
    *root.glob('backend/src/**/*.js'),
    *root.glob('backend/tests/**/*.js'),
    *root.glob('frontend/src/**/*.js'),
    *root.glob('frontend/src/**/*.jsx'),
    *root.glob('mobile/src/**/*.js'),
    root / 'mobile' / 'App.js',
    root / 'mobile' / 'index.js',
]
import_re = re.compile(r"^\s*import\s.+?from\s+['\"](.+?)['\"]", re.M)

missing = []
for file_path in files:
    text = file_path.read_text(encoding='utf-8')
    for match in import_re.finditer(text):
        spec = match.group(1)
        if not spec.startswith('.'):
            continue
        base = (file_path.parent / spec).resolve()
        candidates = [
            base,
            pathlib.Path(str(base) + '.js'),
            pathlib.Path(str(base) + '.jsx'),
            base / 'index.js',
            base / 'index.jsx',
        ]
        if not any(candidate.exists() for candidate in candidates):
            missing.append((str(file_path), spec))

if missing:
    print('Missing local imports:')
    for file_path, spec in missing:
        print(f' - {file_path} -> {spec}')
    sys.exit(1)
PY
  then
    ok "Relative import resolution check passed"
  else
    fail "Relative import resolution check failed"
  fi
else
  warn "python3 not found; skipped import-resolution scan"
fi

if command -v curl >/dev/null 2>&1; then
  HEALTH_STATUS="$(curl -s -o /tmp/gametime_health.json -w '%{http_code}' -m 2 http://localhost:4000/health || true)"
  if [ "$HEALTH_STATUS" != "200" ] && command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    npm run start -w backend >/tmp/gametime_backend_runtime.log 2>&1 &
    BACKEND_PID=$!
    BACKEND_STARTED_BY_CHECK=1
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      sleep 1
      HEALTH_STATUS="$(curl -s -o /tmp/gametime_health.json -w '%{http_code}' -m 2 http://localhost:4000/health || true)"
      if [ "$HEALTH_STATUS" = "200" ]; then
        break
      fi
    done
  fi

  if [ "$HEALTH_STATUS" = "200" ]; then
    ok "Backend health endpoint responds on http://localhost:4000/health"

    AUTH_STATUS="$(curl -sS -o /tmp/gametime_auth_guard.json -w '%{http_code}' -m 2 http://localhost:4000/points/transactions || true)"
    if [ "$AUTH_STATUS" = "401" ]; then
      ok "Auth guard returns 401 for unauthenticated protected endpoint"
    else
      fail "Expected 401 for unauthenticated protected endpoint, got $AUTH_STATUS"
      cat /tmp/gametime_auth_guard.json
    fi

    JSON_STATUS="$(printf '{\"bad\":' | curl -sS -o /tmp/gametime_bad_json.json -w '%{http_code}' -m 2 -H 'Content-Type: application/json' --data-binary @- http://localhost:4000/auth/login || true)"
    if [ "$JSON_STATUS" = "400" ]; then
      ok "Invalid JSON payload returns 400"
    else
      fail "Expected 400 for invalid JSON payload, got $JSON_STATUS"
      cat /tmp/gametime_bad_json.json
    fi
  else
    fail "Backend is not reachable on localhost:4000; live API checks failed"
    if [ -f /tmp/gametime_backend_runtime.log ]; then
      tail -n 80 /tmp/gametime_backend_runtime.log
    fi
  fi
else
  warn "curl not found; skipped live API checks"
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  if npm run test -w backend >/tmp/gametime_backend_test.log 2>&1; then
    ok "Backend test suite passed"
  else
    fail "Backend test suite failed"
    cat /tmp/gametime_backend_test.log
  fi

  if npm run build -w frontend >/tmp/gametime_frontend_build.log 2>&1; then
    ok "Frontend build passed"
  else
    fail "Frontend build failed"
    cat /tmp/gametime_frontend_build.log
  fi

  if [ "${SKIP_MOBILE_CHECK:-0}" = "1" ]; then
    warn "SKIP_MOBILE_CHECK=1; skipped mobile export check"
  elif command -v npx >/dev/null 2>&1; then
    if (cd mobile && npx expo export --platform web >/tmp/gametime_mobile_export.log 2>&1); then
      ok "Mobile web bundle export passed"
    else
      fail "Mobile web bundle export failed"
      cat /tmp/gametime_mobile_export.log
    fi
  else
    warn "npx not found; skipped mobile export check"
  fi
else
  warn "node/npm not found; skipped backend tests, frontend build, and mobile export checks"
fi

echo
echo "System check summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed, ${WARN_COUNT} warnings."

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
