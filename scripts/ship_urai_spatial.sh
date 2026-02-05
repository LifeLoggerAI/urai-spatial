#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d_%H%M%S)

for file in firebase.json firestore.rules; do
  [ -f "$file" ] && cp "$file" "${file}.bak.${TS}"
done

if ! command -v npx --yes pnpm@8.15.9 &> /dev/null; then
    echo "corepack enable skipped (read-only fs)"
fi

npx --yes pnpm@8.15.9 install --no-optional
npx --yes pnpm@8.15.9 lint
npx --yes pnpm@8.15.9 typecheck
npx --yes pnpm@8.15.9 build
npx --yes pnpm@8.15.9 test

firebase deploy --only hosting,functions,firestore

echo "SHIP COMPLETE @ $TS"
