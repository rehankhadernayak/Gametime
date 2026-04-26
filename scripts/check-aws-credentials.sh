#!/usr/bin/env bash
# Safe diagnostics for AWS credential invalid-character issues (does not print secret values).
set -euo pipefail

echo "==> process.env (lengths + CR/LF check)"
for v in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN AWS_PROFILE AWS_REGION; do
  x="${!v-}"
  len=${#x}
  warn=""
  if [[ -n "$x" ]]; then
    if printf '%s' "$x" | grep -q $'[\r\n]'; then
      warn=" WARNING: contains CR or LF"
    fi
    t="$(printf '%s' "$x" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    if [[ "$x" != "$t" ]]; then
      warn="${warn} WARNING: leading/trailing whitespace"
    fi
  fi
  printf '%s len=%s%s\n' "$v" "$len" "$warn"
done

CREDS="${HOME}/.aws/credentials"
if [[ -f "$CREDS" ]]; then
  echo ""
  echo "==> ~/.aws/credentials (line repr, first non-empty non-comment lines)"
  python3 - <<'PY'
import os
p = os.path.expanduser("~/.aws/credentials")
if not os.path.isfile(p):
    raise SystemExit(0)
with open(p, "rb") as f:
    data = f.read()
print("file bytes:", len(data), "CR present:", b"\r" in data)
shown = 0
for i, line in enumerate(data.splitlines(True)):
    s = line.strip()
    if not s or s.startswith(b"#"):
        continue
    print(i, repr(line[:120]))
    shown += 1
    if shown >= 25:
        break
PY
  echo ""
  echo "To sanitize ~/.aws/credentials in-place (creates .credentials.bak next to file):"
  echo "  python3 $(dirname "$0")/sanitize-aws-credentials-file.py"
else
  echo ""
  echo "~/.aws/credentials not found (using env or SSO only)."
fi
