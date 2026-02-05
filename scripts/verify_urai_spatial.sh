#!/usr/bin/env bash
set -euo pipefail

URL=$(firebase hosting:sites:list | head -n1 | awk '{print $2}')

if [ -z "$URL" ]; then
    echo "Could not determine hosting URL"
    exit 1
fi

curl -f "$URL/life-map"
curl -f "$URL/dream-planetarium"
curl -f "$URL/ritual-ar"

firebase firestore:rules:get >/dev/null

echo "VERIFY OK"
