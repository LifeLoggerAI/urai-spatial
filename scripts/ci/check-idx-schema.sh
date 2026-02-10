#!/usr/bin/env bash
set -euo pipefail

FILE=".idx/dev.nix"

echo "[IDX-SCHEMA] Checking $FILE"

# 1. Reject old nested schema
if grep -q "idx\.previews\.previews" "$FILE"; then
  echo "❌ IDX SCHEMA ERROR: nested idx.previews.previews detected"
  echo "➡ Use flat idx.previews.<name> instead"
  exit 1
fi

# 2. Ensure previews block exists
if ! grep -q "previews\s*=" "$FILE"; then
  echo "❌ IDX SCHEMA ERROR: idx.previews block missing"
  exit 1
fi

# 3. Ensure each preview has a port
MISSING_PORT=$(grep -n "previews = {" -A 200 "$FILE" | grep -B2 "command =" | grep -v "port =" || true)
if [[ -n "$MISSING_PORT" ]]; then
  echo "❌ IDX SCHEMA ERROR: preview missing port"
  echo "$MISSING_PORT"
  exit 1
fi

echo "✅ IDX schema OK (v1 compatible)"
