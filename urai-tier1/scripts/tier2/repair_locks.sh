#!/usr/bin/env bash
set -euo pipefail

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f package.json ] || die "run from repo root"

echo "== remove stale next dev lock files =="
find . -type f -path '*/.next/dev/lock' -print -delete || true

echo "== remove stale build traces that commonly poison restarts =="
find . -type f \( -name '*.tsbuildinfo' -o -name 'next-development.log' \) -print || true

echo "repair_locks complete"
