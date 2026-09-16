#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PYTHONPATH="/usr/lib/python3.12:/usr/lib/python3.12/lib-dynload:/opt/codex/runtimes/codex-primary-runtime/dependencies/python/lib/python3.12/site-packages${PYTHONPATH:+:$PYTHONPATH}"
exec blender --background --python "$task_root/scripts/blender/generate-life-map-sanctuary-v215.py"
