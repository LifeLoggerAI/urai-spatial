#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# urai_deploy_production.sh
# Locked production deploy script for URAI.
#
# Behavior:
# - Fails on any error
# - Writes a full log to /tmp
# - Refuses deploy on dirty git state
# - Refuses deploy without lockfile
# - Runs ship:check if present
# - Runs smoke test if present
# - Shows active Firebase target before deploy
#
# Run from repo root.
###############################################################################

TS="$(date +%Y%m%d_%H%M%S)"
LOG="/tmp/urai_deploy_production.${TS}.log"
exec > >(tee -a "$LOG") 2>&1

echo "== URAI DEPLOY TO PRODUCTION =="
echo "LOG=$LOG"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: missing required command: $1"
    exit 1
  }
}

need git
need node
need pnpm
need firebase
need bash

echo
echo "--- STAGE 0: REPO ROOT CHECK ---"
[ -f package.json ] || { echo "ERROR: package.json not found. Run from repo root."; exit 1; }
[ -f firebase.json ] || { echo "ERROR: firebase.json not found. Run from repo root."; exit 1; }
[ -f pnpm-lock.yaml ] || { echo "ERROR: pnpm-lock.yaml missing. Refusing unlocked deploy."; exit 1; }

echo "✅ Repo root verified."

echo
echo "--- STAGE 1: TOOLING ---"
echo "node:     $(node --version)"
echo "pnpm:     $(pnpm --version)"
echo "firebase: $(firebase --version)"
echo "git:      $(git --version | head -n 1)"

echo
echo "--- STAGE 2: GIT STATE ---"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not inside a git repository."
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  echo "ERROR: working tree has uncommitted changes. Commit or stash before deploying."
  git status --short
  exit 1
fi

echo "✅ Git working tree clean."

echo
echo "--- STAGE 3: INSTALL ---"
pnpm install --frozen-lockfile
echo "✅ Dependencies installed from lockfile."

echo
echo "--- STAGE 4: PRE-DEPLOY CHECKS ---"

if node -e 'const p=require("./package.json"); process.exit(p.scripts && p.scripts["ship:check"] ? 0 : 1)'; then
  pnpm run ship:check
  echo "✅ ship:check passed."
else
  echo "ERROR: package.json is missing script: ship:check"
  exit 1
fi

echo
echo "--- STAGE 5: SMOKE TEST ---"
if [ -f "scripts/urai_smoke_core.sh" ]; then
  bash scripts/urai_smoke_core.sh
  echo "✅ Smoke test passed."
else
  echo "WARN: scripts/urai_smoke_core.sh not found. Skipping smoke test."
fi

echo
echo "--- STAGE 6: FIREBASE TARGET ---"
firebase use

echo
echo "--- STAGE 7: DEPLOY ---"
if [ "${CI:-}" = "true" ]; then
  echo "CI=true detected. Deploying non-interactively."
else
  read -r -p "Deploy to the Firebase target shown above? (y/N) " REPLY
  if [[ ! "${REPLY:-}" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
  fi
fi

firebase deploy
echo "✅ Deployment succeeded."

echo
echo "--- STAGE 8: POST-DEPLOY ---"
echo "Deployment complete."
echo
echo "Feature flag rollout examples:"
echo "  bash scripts/urai_spatial_ship.sh <admin-uid>"
echo "  bash scripts/urai_spatial_ship.sh percentage:10"
echo "  bash scripts/urai_spatial_ship.sh all"
echo
echo "Done."