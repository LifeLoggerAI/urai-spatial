#!/usr/bin/env bash
# One UrAi R799 local acceptance; synthetic only. This never grants release GO.
set -Eeuo pipefail
umask 077
OUT="$(mktemp -d /tmp/urai-genesis-exact.XXXXXX)"
REPORT="$OUT/stages.tsv"
printf 'gate\tstatus\texit\tlog_sha256\n' > "$REPORT"
record() {
  local gate="$1" status="$2" code="$3" log="$4"
  local sum=none
  if [[ -f "$log" ]]; then sum="$(sha256sum "$log" | cut -d' ' -f1)"; fi
  printf '%s\t%s\t%s\t%s\n' "$gate" "$status" "$code" "$sum" >> "$REPORT"
  printf '%s: %s (exit=%s)\n' "$gate" "$status" "$code"
}
block() {
  printf '%s\n' "$2" > "$OUT/$1.log"
  record "$1" BLOCKED 2 "$OUT/$1.log"
  printf 'GENESIS HOLD; evidence: %s\n' "$OUT"
  exit 2
}
run() {
  local gate="$1" limit="$2" code=0
  shift 2
  timeout -k 15 "$limit" "$@" > "$OUT/$gate.log" 2>&1 || code=$?
  if ((code)); then record "$gate" FAIL "$code" "$OUT/$gate.log"; block downstream "Required $gate failed; no fallback."
  else record "$gate" PASS 0 "$OUT/$gate.log"; fi
}
# Required exact SHA must be supplied by a separately reviewed candidate.
if [[ ! -v URAI_EXPECTED_HEAD ]]; then block source 'Set URAI_EXPECTED_HEAD to the exact reviewed commit SHA.'; fi
if [[ ! "$URAI_EXPECTED_HEAD" =~ ^[0-9a-f]{40}$ ]]; then block source 'Invalid expected source identity.'; fi
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then block source 'Full Git checkout missing.'; fi
HEAD_SHA="$(git rev-parse HEAD)"
if [[ "$HEAD_SHA" != "$URAI_EXPECTED_HEAD" ]] || [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  block source 'Source does not match the exact clean reviewed head.'
fi
printf '%s\n' "$HEAD_SHA" > "$OUT/source.log"
record source PASS 0 "$OUT/source.log"
# Prevent accidental live-project admission and prevent passing sensitive keys.
for name in GOOGLE_APPLICATION_CREDENTIALS FIREBASE_TOKEN GITHUB_TOKEN GH_TOKEN RUNPOD_API_KEY STRIPE_SECRET_KEY OPENAI_API_KEY GOOGLE_CLOUD_PROJECT GCLOUD_PROJECT; do
  if printenv "$name" >/dev/null 2>&1; then block environment "Unsafe active environment variable: $name"; fi
done
for name in node pnpm timeout sha256sum; do
  if ! command -v "$name" >/dev/null 2>&1; then block dependencies "Missing installed $name (no automatic downloads)."; fi
done
if [[ "$(node --version)" != v22.* ]] || [[ "$(pnpm --version)" != '10.0.0' ]]; then
  block dependencies 'Node 22 and pnpm 10.0.0 are mandatory.'
fi
record dependencies PASS 0 "$OUT/source.log"
# Run the inherited R801 safety tests and exact four-service project/rules
# preflight BEFORE any dependency install, native build, or emulator startup.
run synthetic_boundary_tests 60 node --test tests/run-memory-media-four-emulator-proof.test.mjs
run synthetic_four_preflight 30 node scripts/run-memory-media-four-emulator-proof.mjs --preflight
run frozen_install 900 pnpm install --frozen-lockfile
run functions_build 600 pnpm --filter urai-functions build
run functions_test 900 pnpm --filter urai-functions test
run firestore_static_boundary 90 node --test tests/firestore.assetManifests.rules.static.test.mjs tests/firestore.privacyConsent.rules.static.test.mjs tests/firestore.lifeModel.rules.static.test.mjs
run firestore_owner_emulator 600 env URAI_REQUIRE_FIRESTORE_EMULATOR=1 node scripts/run-firestore-rules-tests.mjs
run tier1_typecheck 600 pnpm --filter urai-tier1 typecheck
run tier1_test 900 pnpm --filter urai-tier1 test:unit
run tier1_build 900 pnpm --filter urai-tier1 build
if ! pnpm exec firebase --version > "$OUT/firebase-cli.log" 2>&1; then block emulator 'No installed Firebase CLI'; fi
# Four real emulators, never three services with HTTP substitutes.
run firebase_four 750 env GCLOUD_PROJECT=demo-memory-media-playback \
  FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9549 \
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8249 \
  STORAGE_EMULATOR_HOST=http://127.0.0.1:9249 \
  pnpm exec firebase emulators:exec \
    --config firebase.memory-media-playback-test.json \
    --project demo-memory-media-playback --only auth,firestore,storage,functions \
    'node apps/functions/scripts/memory-media-playback-emulator-proof.cjs'
# This test deliberately DENIES positive playback without production bucket IAM.
# Additional integration, physical devices, protected CI, reviewer and founder
# approvals MUST be supplied independently. A local green suite is not a GO.
block production_go 'Four-service synthetic proof cannot certify protected playback, Studio/Jobs rendering, physical devices, CI or independent reviewer.'
