#!/usr/bin/env bash
set -euo pipefail

# urai_spatial_scaffold.sh
# Purpose: Create required directories and placeholder files for all workstreams.
# Behavior:
# - Safe to re-run
# - Does not overwrite existing files
# - Marks shell scripts executable
# - Prints a clear summary of what was created

echo "=== Scaffolding URAI Spatial Memory System ==="

created_dirs=0
created_files=0
existing_files=0

make_dir() {
  local dir="$1"
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    echo "DIR  + $dir"
    created_dirs=$((created_dirs + 1))
  else
    echo "DIR  = $dir"
  fi
}

make_file() {
  local file="$1"
  local content="${2:-}"
  local parent
  parent="$(dirname "$file")"
  mkdir -p "$parent"

  if [ ! -f "$file" ]; then
    printf "%s" "$content" > "$file"
    echo "FILE + $file"
    created_files=$((created_files + 1))
  else
    echo "FILE = $file"
    existing_files=$((existing_files + 1))
  fi
}

make_exec_file() {
  local file="$1"
  local content="${2:-}"
  make_file "$file" "$content"
  chmod +x "$file"
}

echo "[A] On-Device Capture"
make_dir "apps/core/src/features/capture/components"
make_dir "apps/core/src/features/capture/hooks"
make_dir "apps/core/src/native/sensor-access"
make_file "packages/schemas/src/capture-package.ts" "export {}\n"
make_file "apps/core/src/features/capture/index.ts" "export {}\n"
make_file "apps/core/src/native/sensor-access/index.ts" "export {}\n"

echo "[B] Location & Time Normalization"
make_dir "packages/spatial-utils/src"
make_file "packages/spatial-utils/src/time.ts" "export {}\n"
make_file "packages/spatial-utils/src/location.ts" "export {}\n"

echo "[C] Spatial Reconstruction"
make_dir "apps/jobs/src/reconstruct-memory"
make_exec_file "apps/jobs/src/reconstruct-memory/run.sh" "#!/usr/bin/env bash
set -euo pipefail

echo \"TODO: implement reconstruct-memory runner\"
"
make_file "apps/jobs/src/reconstruct-memory/Dockerfile" "FROM node:20-alpine
WORKDIR /app
COPY . .
CMD [\"sh\", \"-c\", \"echo TODO: implement reconstruct-memory container\"]
"
make_file "apps/jobs/src/reconstruct-memory/README.md" "# Spatial Reconstruction

TODO:
- implement reconstruction job
- wire into Firebase / Cloud Run trigger
- define input/output contract
"

echo "[D] Persistent Anchor System"
make_file "packages/schemas/src/anchor.ts" "export {}\n"
make_file "packages/spatial-utils/src/anchor-resolver.ts" "export {}\n"

echo "[E] Memory / Event Data Model"
make_file "packages/schemas/src/memory.ts" "export {}\n"

echo "[F] Playback Engine"
make_dir "apps/core/src/features/replay/components"
make_dir "apps/core/src/features/replay/hooks"
make_file "apps/core/src/features/replay/components/WebPlayer.tsx" "export default function WebPlayer() {
  return null
}
"
make_file "apps/core/src/features/replay/components/ARPlayer.tsx" "export default function ARPlayer() {
  return null
}
"
make_file "apps/core/src/features/replay/hooks/use-memory-loader.ts" "export function useMemoryLoader() {
  return null
}
"

echo "[G] Storage + Sync"
make_file "docs/storage-sync-notes.md" "# Storage + Sync

TODO:
- update firestore rules
- update storage rules
- define sync lifecycle
"

echo "[H] Privacy / Consent / Redaction"
make_file "apps/core/src/features/replay/components/PrivacyNotice.tsx" "export default function PrivacyNotice() {
  return null
}
"
make_file "firebase/functions/src/cleanup.ts" "export {}\n"

echo "[I] Performance & Cost Controls"
make_dir "docs"
make_file "docs/cost-controls.md" "# Cost Controls

TODO:
- budget limits
- storage lifecycle
- replay caching strategy
- reconstruction throttling
"

echo "[J] Determinism + Regression Tests"
make_dir "scripts/tests/data/golden-capture-01"
make_exec_file "scripts/tests/spatial-smoke-test.sh" "#!/usr/bin/env bash
set -euo pipefail

echo \"TODO: implement spatial smoke test\"
"
make_file "scripts/tests/data/golden-capture-01/.gitkeep" ""

echo "[K] Launch & Rollout Gates"
make_dir "packages/feature-flags/src"
make_file "packages/feature-flags/src/README-spatial-flags.md" "# Spatial Flags

TODO:
- add spatial memory feature flags
- define rollout gates
- define kill switches
"

echo
echo "=== Scaffold complete ==="
echo "Created directories : $created_dirs"
echo "Created files       : $created_files"
echo "Existing files kept : $existing_files"
echo
echo "Manual follow-ups still required:"
echo "  - firebase/functions/src/index.ts trigger wiring"
echo "  - firebase/firestore.rules updates"
echo "  - firebase/storage.rules updates"
echo "  - packages/feature-flags/src/flags.ts flag registration"