#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../.." || exit 1

pnpm typecheck
pnpm build

echo "[PASS] CURRENT URAI LOCK VERIFIED"
