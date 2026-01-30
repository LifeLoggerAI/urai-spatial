#!/bin/bash
set -euo pipefail

###############################################################################
# urai_deploy_production.sh
# The final step: runs all checks, deploys to Firebase, and provides
# post-deploy instructions for feature flag management.
#
# Assumes previous lock/audit/fix scripts have been run.
#
# RUN FROM REPO ROOT
###############################################################################

TS="$(date +%Y%m%d_%H%M%S)"
LOG="/tmp/urai_deploy_production.${TS}.log"
exec > >(tee -a "$LOG") 2>&1

echo "== URAI DEPLOY TO PRODUCTION =="
echo "LOG=$LOG"

need(){ command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing '$1'"; exit 1; }; }
need git
need pnpm
need firebase
need bash

# --- Pre-flight Checks ---
echo
echo "--- STAGE 1: PRE-FLIGHT CHECKS ---"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "ERROR: Uncommitted changes in the working tree. Please commit or stash before deploying."
    git status --porcelain
    exit 1
fi
echo "✅ Git status is clean."

# Run ship:check (lint, typecheck, build)
if pnpm -w run ship:check; then
    echo "✅ ship:check passed."
else
    echo "❌ ERROR: ship:check failed. Check logs."
    exit 1
fi

# --- Smoke Test ---
echo
echo "--- STAGE 2: SMOKE TEST ---"
if [ -f "scripts/urai_smoke_core.sh" ]; then
    if bash scripts/urai_smoke_core.sh; then
        echo "✅ Smoke test passed."
    else
        echo "❌ ERROR: Smoke test failed. Check logs."
        exit 1
    fi
else
    echo "⚠️ WARNING: scripts/urai_smoke_core.sh not found. Skipping smoke test."
fi

# --- Final Confirmation ---
echo
echo "--- STAGE 3: DEPLOYMENT ---"
echo "All checks passed. Ready to deploy to Firebase."
firebase use

read -p "ARE YOU SURE you want to deploy to production? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# --- Deploy ---
echo "Deploying to Firebase..."
if firebase deploy; then
    echo "✅ DEPLOYMENT SUCCEEDED."
else
    echo "❌ DEPLOYMENT FAILED. Check Firebase logs."
    exit 1
fi

# --- Post-Deploy Instructions ---
echo
echo "--- STAGE 4: POST-DEPLOY ROLLOUT ---"
echo "Deployment is complete. You can now manage the 'spatial_memories' feature flag."
echo "Use the ship script to control rollout:"
echo
echo "  # Rollout to admins or a specific user:"
echo "  bash scripts/urai_spatial_ship.sh <your-admin-uid>"
echo
echo "  # Rollout to a percentage of users:"
echo "  bash scripts/urai_spatial_ship.sh percentage:10"
echo
echo "  # Rollout to everyone:"
echo "  bash scripts/urai_spatial_ship.sh all"
echo
echo "== PRODUCTION DEPLOYMENT SCRIPT COMPLETE =="
