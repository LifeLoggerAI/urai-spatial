#!/usr/bin/env bash
# =========================================================
# URAI-SPATIAL — LOCKED DEPLOYMENT SCRIPT
#
# Status: 🔒 LOCKED
# Invariants:
#  - Fails on any error (set -e)
#  - Logs commands (set -x)
#  - Halts if any command in a pipe fails (pipefail)
# =========================================================

set -euxo pipefail

# --- Pre-flight Checks ---
echo "[SHIP] Verifying environment..."
pnpm --version
firebase --version
node --version

# --- Installation ---
echo "[SHIP] Installing dependencies..."
pnpm install --frozen-lockfile

# --- Build ---
echo "[SHIP] Building project..."
pnpm build

# --- Deployment ---
echo "[SHIP] Deploying to Firebase..."
# The firebase CLI will use the currently authenticated user.
# CI environments should have this pre-configured.
firebase deploy

# --- Verification ---
echo "[SHIP] ✅ DEPLOYMENT SUCCEEDED"
echo "[SHIP] Live application should be available at https://urai-spatial.web.app"
