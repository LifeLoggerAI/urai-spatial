#!/usr/bin/env bash
set -euo pipefail

cd /home/user/urai-spatial/urai-tier1 || exit 1

echo "== typecheck =="
pnpm typecheck

echo
echo "== build =="
pnpm build --webpack

echo
echo "== demo data exists =="
test -f demo/spatial-demo-memories.json
wc -l demo/spatial-demo-memories.json

echo
echo "== overlay + narrator anchors =="
grep -RIn "SpatialMemoryOverlay\|Tier3NarratorOverlay\|selectedMemory" src/spatial || true

echo
echo "PASS: demo verification complete"
