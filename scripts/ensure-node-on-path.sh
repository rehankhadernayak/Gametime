#!/usr/bin/env bash
# Ensure node and npm are available for Cursor Cloud / minimal Linux images without system Node.
# Safe to source multiple times; idempotent install under .cursor/runtime/ (gitignored).
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_REPO_ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"

if command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  return 0 2>/dev/null || exit 0
fi

_NODE_VER_FILE="$_REPO_ROOT/.node-version"
if [ -f "$_NODE_VER_FILE" ]; then
  NODE_VERSION="$(tr -d '[:space:]' < "$_NODE_VER_FILE" | head -n1)"
else
  NODE_VERSION="${CURSOR_NODE_VERSION:-20.19.4}"
fi

_platform_triplet() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"
  case "$arch" in
    x86_64 | amd64) arch="x64" ;;
    aarch64 | arm64) arch="arm64" ;;
    *)
      echo "ensure-node-on-path: unsupported CPU architecture: $(uname -m)" >&2
      return 1
      ;;
  esac
  case "$os" in
    linux) echo "linux-${arch}" ;;
    darwin) echo "darwin-${arch}" ;;
    *)
      echo "ensure-node-on-path: unsupported OS: $(uname -s)" >&2
      return 1
      ;;
  esac
}

_PLATFORM="$(_platform_triplet)"
_RUNTIME_ROOT="$_REPO_ROOT/.cursor/runtime"
_PREFIX="$_RUNTIME_ROOT/node-v${NODE_VERSION}-${_PLATFORM}"
_BIN="$_PREFIX/bin"

if [ -x "$_BIN/npm" ] && [ -x "$_BIN/node" ]; then
  export PATH="$_BIN:$PATH"
  return 0 2>/dev/null || exit 0
fi

_download() {
  local url="$1" dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$dest" "$url"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$dest" "$url"
  else
    echo "ensure-node-on-path: need curl or wget to download Node.js" >&2
    return 1
  fi
}

_TARBALL="node-v${NODE_VERSION}-${_PLATFORM}.tar.xz"
_URL="https://nodejs.org/dist/v${NODE_VERSION}/${_TARBALL}"
_TMP="$_RUNTIME_ROOT/${_TARBALL}.tmp.$$"

mkdir -p "$_RUNTIME_ROOT"
rm -f "$_TMP"
if ! _download "$_URL" "$_TMP"; then
  rm -f "$_TMP"
  echo "ensure-node-on-path: failed to download ${_URL}" >&2
  echo "ensure-node-on-path: set .node-version to a valid Node release (see https://nodejs.org/dist/) or install Node/nvm on the image." >&2
  return 1 2>/dev/null || exit 1
fi

rm -rf "$_PREFIX"
mkdir -p "$_PREFIX"
tar -xJf "$_TMP" -C "$_PREFIX" --strip-components=1
rm -f "$_TMP"

if [ ! -x "$_BIN/npm" ]; then
  echo "ensure-node-on-path: npm missing after extract at $_BIN" >&2
  return 1 2>/dev/null || exit 1
fi

export PATH="$_BIN:$PATH"
return 0 2>/dev/null || exit 0
