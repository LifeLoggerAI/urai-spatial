#!/usr/bin/env bash
set -euo pipefail

die(){ echo "MASTER_CERT_FAIL: $*" >&2; exit 1; }

ROOT="$(pwd)"
AUTH_CERT="scripts/tier2/authority-cert.sh"
STRUCT_CERT="scripts/tier2/scene-structure-cert.sh"

[ -x "$AUTH_CERT" ] || die "authority cert missing or not executable"
[ -x "$STRUCT_CERT" ] || die "scene structure cert missing or not executable"

echo "== AUTHORITY CERT =="
bash "$AUTH_CERT"

echo
echo "== SCENE STRUCTURE CERT =="
bash "$STRUCT_CERT"

echo
echo "== TYPECHECK =="
pnpm typecheck

echo
echo "== BUILD =="
pnpm build

echo
echo "MASTER_CERT_PASS: all certification gates passed"
