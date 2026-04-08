#!/usr/bin/env bash
set -euo pipefail

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f package.json ] || die "run from repo root"

echo "== tier2 audit =="
bash scripts/tier2/audit.sh

echo
echo "== typecheck =="
pnpm typecheck

echo
echo "== build =="
pnpm build

echo
echo "Tier-2 verification PASS"
