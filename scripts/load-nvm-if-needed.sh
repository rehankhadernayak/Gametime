#!/usr/bin/env bash
# Load Node version managers for non-interactive shells (e.g. workspace boot) where node/npm are not on PATH.
if command -v npm >/dev/null 2>&1; then
  return 0 2>/dev/null || exit 0
fi

# nvm: respect NVM_DIR / NVM_HOME if set (some CI images use non-default locations).
for _nvm_sh in "${NVM_DIR:-}/nvm.sh" "${NVM_HOME:-}/nvm.sh" "${HOME}/.nvm/nvm.sh"; do
  if [ -s "$_nvm_sh" ]; then
    # shellcheck disable=SC1090
    . "$_nvm_sh"
    break
  fi
done
unset _nvm_sh

if ! command -v npm >/dev/null 2>&1 && command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --use-on-cd --shell bash)" || true
fi

if ! command -v npm >/dev/null 2>&1 && command -v volta >/dev/null 2>&1; then
  export VOLTA_HOME="${VOLTA_HOME:-$HOME/.volta}"
  export PATH="$VOLTA_HOME/bin:$PATH"
fi

if ! command -v npm >/dev/null 2>&1; then
  _loader_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  # shellcheck disable=SC1091
  . "$_loader_dir/ensure-node-on-path.sh"
  unset _loader_dir
fi
