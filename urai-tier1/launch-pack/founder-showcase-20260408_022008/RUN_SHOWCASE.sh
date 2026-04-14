#!/usr/bin/env bash
set -euo pipefail

cd /home/user/urai-spatial/urai-tier1 || exit 1
pkill -f "next dev" 2>/dev/null || true
rm -rf .next
pnpm dev
