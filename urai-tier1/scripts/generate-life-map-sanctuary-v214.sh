#!/usr/bin/env bash
set -euo pipefail

PYTHONPATH=/usr/lib/python3.12:/usr/lib/python3.12/lib-dynload:${CODEX_PRIMARY_RUNTIME_ROOT:-/opt/codex/runtimes/codex-primary-runtime}/dependencies/python/lib/python3.12/site-packages \
  blender --background --python scripts/blender/generate-life-map-sanctuary-v214.py

sha256sum public/assets/urai/life-map-production/authored-v214/life-map-memory-sanctuary-v214.glb
