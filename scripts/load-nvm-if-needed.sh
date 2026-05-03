#!/usr/bin/env bash
# Load nvm for non-interactive shells (e.g. workspace boot) where node/npm are not on PATH.
if ! command -v npm >/dev/null 2>&1 && [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${HOME}/.nvm/nvm.sh"
fi
