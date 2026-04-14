#!/usr/bin/env bash
set -euo pipefail

die(){ echo "LOCK_DRIFT_FAIL: $*" >&2; exit 1; }

ROOT="$(pwd)"
LATEST_MANIFEST="$(find "${ROOT}/_audit" -type f -path '*/manifest.txt' | sort | tail -n 1)"
[ -n "$LATEST_MANIFEST" ] || die "no manifest found in _audit"

TMP_EXPECTED="$(mktemp)"
TMP_CURRENT="$(mktemp)"
trap 'rm -f "$TMP_EXPECTED" "$TMP_CURRENT"' EXIT

awk '
BEGIN { in_sha=0 }
{
  if ($0 == "== SHA256 ==") { in_sha=1; next }
  if (in_sha==1) {
    if ($0 == "") exit
    print
  }
}
' "$LATEST_MANIFEST" > "$TMP_EXPECTED"

[ -s "$TMP_EXPECTED" ] || die "failed to extract SHA256 block from manifest: $LATEST_MANIFEST"

awk '{print $2}' "$TMP_EXPECTED" | while read -r f; do
  [ -f "$f" ] || die "locked file missing: $f"
done

sha256sum $(awk '{print $2}' "$TMP_EXPECTED") > "$TMP_CURRENT"

if ! diff -u "$TMP_EXPECTED" "$TMP_CURRENT" >/dev/null 2>&1; then
  echo "== EXPECTED =="
  cat "$TMP_EXPECTED"
  echo
  echo "== CURRENT =="
  cat "$TMP_CURRENT"
  echo
  diff -u "$TMP_EXPECTED" "$TMP_CURRENT" || true
  die "lock drift detected"
fi

bash scripts/tier2/authority-cert.sh
bash scripts/tier2/scene-structure-cert.sh
bash scripts/tier2/master-cert.sh

echo "LOCK_DRIFT_PASS: current state matches latest manifest"
