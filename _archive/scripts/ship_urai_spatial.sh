#!/usr/bin/env bash
# =========================================================
# URAI-SPATIAL — LOCKED DEPLOYMENT SCRIPT
# =========================================================

set -euo pipefail

echo "=== URAI-SPATIAL LOCKED DEPLOY START ==="

REPO_DIR="${HOME}/urai-spatial"
cd "$REPO_DIR"

echo "[1/8] Verifying required tools..."
command -v node >/dev/null 2>&1 || { echo "ERROR: node not found"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "ERROR: pnpm not found"; exit 1; }
command -v firebase >/dev/null 2>&1 || { echo "ERROR: firebase CLI not found"; exit 1; }

echo "[2/8] Tool versions"
node --version
pnpm --version
firebase --version

echo "[3/8] Verifying repo files..."
[ -f package.json ] || { echo "ERROR: package.json missing"; exit 1; }
[ -f firebase.json ] || { echo "ERROR: firebase.json missing"; exit 1; }

if [ -f pnpm-lock.yaml ]; then
  echo "[4/8] Installing dependencies from lockfile..."
  pnpm install --frozen-lockfile
else
  echo "ERROR: pnpm-lock.yaml missing. Refusing unlocked install."
  exit 1
fi

echo "[5/8] Type checking if available..."
if node -e 'const p=require("./package.json"); process.exit(p.scripts && p.scripts.typecheck ? 0 : 1)' >/dev/null 2>&1; then
  pnpm typecheck
else
  echo "No typecheck script found. Skipping."
fi

echo "[6/8] Linting if available..."
if node -e 'const p=require("./package.json"); process.exit(p.scripts && p.scripts.lint ? 0 : 1)' >/dev/null 2>&1; then
  pnpm lint
else
  echo "No lint script found. Skipping."
fi

echo "[7/8] Building project..."
pnpm build

echo "[8/8] Deploying to Firebase..."
firebase deploy

echo "=== DEPLOYMENT SUCCEEDED ==="
echo "Project directory: $REPO_DIR"
echo "Check Firebase CLI output above for the exact live URL."