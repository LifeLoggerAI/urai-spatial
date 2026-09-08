#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
asset="$repo_root/urai-tier1/public/assets/urai/life-map-production/authored-v212/life-map-memory-sanctuary-v212.glb"
optimized="$(mktemp --suffix=.glb)"
trap 'rm -f "$optimized"' EXIT

cd "$repo_root"
PATH=/usr/bin:/bin env -u PYTHONHOME -u PYTHONPATH \
  blender -b --python urai-tier1/scripts/blender/generate-life-map-sanctuary-v212.py

corepack pnpm dlx @gltf-transform/cli@4.2.1 optimize \
  "$asset" "$optimized" \
  --compress meshopt \
  --texture-compress webp \
  --texture-size 384 \
  --simplify-error 0.0005

cp "$optimized" "$asset"
sha256sum "$asset"
