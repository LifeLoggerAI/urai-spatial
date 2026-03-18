#!/usr/bin/env bash
set -euo pipefail

cd ~/urai-spatial/urai-tier1

fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3040/tcp 2>/dev/null || true

pnpm install
pnpm build
pnpm exec next dev -H 127.0.0.1 -p 3040
