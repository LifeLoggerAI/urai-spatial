#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${1:-$(pwd)}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

cd "$ROOT"

find . \
  -type f \
  \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "./node_modules/*" \
  ! -path "./.next/*" \
  ! -path "./dist/*" \
  ! -path "./build/*" \
  ! -path "./coverage/*" \
  ! -path "./.git/*" \
  ! -path "./_audit/*" \
  ! -path "./.turbo/*" \
  ! -path "./src/lib/uraiCanon/starTypes.ts" \
  ! -path "./src/lib/uraiCanon/starData.ts" \
  ! -path "./src/lib/uraiCanon/starSchema.ts" \
  -print0 |
while IFS= read -r -d '' f; do
  if grep -nE '\b(type|interface)[[:space:]]+(SelectedStar|StarNode)\b' "$f" >/dev/null 2>&1; then
    echo "DRIFT TYPE DEF: $f" >> "$TMP"
    grep -nE '\b(type|interface)[[:space:]]+(SelectedStar|StarNode)\b' "$f" >> "$TMP" || true
    echo "" >> "$TMP"
  fi
done

if [ -s "$TMP" ]; then
  echo "STAR SCHEMA DRIFT DETECTED"
  echo
  cat "$TMP"
  exit 1
fi

echo "PASS: no drifting SelectedStar/StarNode definitions detected"
