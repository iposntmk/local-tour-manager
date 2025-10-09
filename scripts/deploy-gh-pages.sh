#!/usr/bin/env bash
set -euo pipefail

BASE_PATH="${VITE_APP_BASE_PATH:-/local-tour-manager}"

echo "Building site with base path: ${BASE_PATH}" >&2
VITE_APP_BASE_PATH="$BASE_PATH" npm run build -- --emptyOutDir

if git remote get-url origin >/dev/null 2>&1; then
  echo "Publishing dist/ to gh-pages." >&2
  npx gh-pages -d dist
else
  echo "No origin remote configured; skipping gh-pages deployment." >&2
fi
