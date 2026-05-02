#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.."

FILE="src/spatial/scene/SpatialScene.tsx"

echo "[CHECK] Canonical anchors"
grep -q "HOME" "$FILE"
grep -q "ASCENT" "$FILE"
grep -q "LIFEMAP" "$FILE"
grep -q "FOCUS" "$FILE"
grep -q "REPLAY" "$FILE"

echo "[CHECK] No invalid Star color/aura references"
! grep -n "selected[?]*\.color" "$FILE"
! grep -n "selected[?]*\.auraColor" "$FILE"

echo "[CHECK] Build integrity"
pnpm typecheck
pnpm build

echo "[PASS] ABSOLUTE FINAL LOCK VERIFIED"
