#!/usr/bin/env bash
set -euo pipefail

echo "===== URAI LOCK PROOF ====="
echo

echo "1) Typecheck"
pnpm typecheck

echo
echo "2) Production build"
pnpm build --webpack

echo
echo "[PASS] URAI lock proof complete"
