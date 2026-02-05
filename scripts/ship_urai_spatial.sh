#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d_%H%M%S)

for file in firebase.json firestore.rules; do
  [ -f "$file" ] && cp "$file" "${file}.bak.${TS}"
done

if ! command -v pnpm &> /dev/null; then
    corepack enable
fi

pnpm install
pnpm lint
pnpm typecheck
pnpm build
pnpm test

firebase deploy --only hosting,functions,firestore

echo "SHIP COMPLETE @ $TS"
