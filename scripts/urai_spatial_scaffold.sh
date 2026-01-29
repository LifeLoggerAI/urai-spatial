#!/bin/bash
# urai_spatial_scaffold.sh
# Purpose: Create all required directories and placeholder files for all workstreams.

echo "--- Scaffolding URAI Spatial Memory System ---"

# Workstream A: On-Device Capture
echo "[A] Scaffolding On-Device Capture..."
mkdir -p apps/core/src/features/capture/components
mkdir -p apps/core/src/features/capture/hooks
mkdir -p apps/core/src/native/sensor-access
touch packages/schemas/src/capture-package.ts
touch apps/core/src/features/capture/index.ts
touch apps/core/src/native/sensor-access/index.ts

# Workstream B: Location & Time Normalization
echo "[B] Scaffolding Location & Time Normalization..."
mkdir -p packages/spatial-utils/src
touch packages/spatial-utils/src/time.ts
touch packages/spatial-utils/src/location.ts

# Workstream C: Spatial Reconstruction
echo "[C] Scaffolding Spatial Reconstruction..."
mkdir -p apps/jobs/src/reconstruct-memory/
touch apps/jobs/src/reconstruct-memory/run.sh
touch apps/jobs/src/reconstruct-memory/Dockerfile
# NOTE: Appending to existing files requires a different approach than simple touch
# You will need to manually add the trigger to firebase/functions/src/index.ts

# Workstream D: Persistent Anchor System
echo "[D] Scaffolding Persistent Anchor System..."
touch packages/schemas/src/anchor.ts
touch packages/spatial-utils/src/anchor-resolver.ts

# Workstream E: Memory / Event Data Model
echo "[E] Scaffolding Memory / Event Data Model..."
touch packages/schemas/src/memory.ts

# Workstream F: Playback Engine
echo "[F] Scaffolding Playback Engine..."
mkdir -p apps/core/src/features/replay/components
mkdir -p apps/core/src/features/replay/hooks
touch apps/core/src/features/replay/components/WebPlayer.tsx
touch apps/core/src/features/replay/components/ARPlayer.tsx
touch apps/core/src/features/replay/hooks/use-memory-loader.ts

# Workstream G: Storage + Sync
echo "[G] Scaffolding Storage + Sync..."
# NOTE: Security rules in firebase/firestore.rules and firebase/storage.rules must be manually updated

# Workstream H: Privacy / Consent / Redaction
echo "[H] Scaffolding Privacy / Consent / Redaction..."
touch apps/core/src/features/replay/components/PrivacyNotice.tsx
touch firebase/functions/src/cleanup.ts

# Workstream I: Performance & Cost Controls
echo "[I] Scaffolding Performance & Cost Controls..."
mkdir -p docs/
touch docs/cost-controls.md

# Workstream J: Determinism + Regression Tests
echo "[J] Scaffolding Determinism + Regression Tests..."
mkdir -p scripts/tests/data/golden-capture-01
touch scripts/tests/spatial-smoke-test.sh
chmod +x scripts/tests/spatial-smoke-test.sh

# Workstream K: Launch & Rollout Gates
echo "[K] Scaffolding Launch & Rollout Gates..."
mkdir -p packages/feature-flags/src
# NOTE: The feature flag needs to be manually added to packages/feature-flags/src/flags.ts

echo "--- Scaffolding complete. ---"
echo "NOTE: Some files like Firebase rules and function triggers require manual edits."
