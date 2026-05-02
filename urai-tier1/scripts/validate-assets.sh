#!/usr/bin/env bash
set -euo pipefail

echo "[ASSET CHECK] scanning public + spatial asset roots"

DIRS=(
  "public"
  "src/spatial"
  "src/lib"
)

for d in "${DIRS[@]}"; do
  if [ -d "$d" ]; then
    echo "[OK] $d exists"
  else
    echo "[MISSING] $d"
  fi
done

echo "[CHECK] public assets"
find public -type f 2>/dev/null | wc -l

echo "[CHECK] spatial assets"
find src/spatial -type f 2>/dev/null | wc -l

echo "[DONE]"
