# One UrAi Genesis — R887 guarded Functions predeploy build custody

Date: 2026-11-07. Source-review only. **PRODUCTION HOLD**. Spatial PR #2073, base `repair/release-closure-integration-20261007` at `4ae01987a0664266642faecad68a1eea0f5b881f`. Do not merge, dispatch deployment, use paid compute, or remove the explicit predeployment `exit 1` without independent release approval.

## Verified problem

The canonical `firebase.json` config, Git blob `340145f0a234fca558a22284d08bbdf6d4af3a10`, has Functions predeploy actions (1) `node scripts/check-spatial-export-deployment-boundary.mjs` and (2) `pnpm --filter urai-functions build`. Prior R883 attestation/verification occurred **before** invoking Firebase CLI, so Firebase's own second build could change the compiled `apps/functions/lib` after byte custody was checked.

## Source correction in this PR

- Added `scripts/r887-guard-functions-predeploy.mjs` with an intentionally restricted two-phase workflow:
  - `--mode prepare` validates the exact `RELEASE_SHA`, Actions run, canonical repository/project, clean tracked `firebase.json`, Node 22, and R883 compiled/source manifest; refuses overwriting prior receipts; creates untracked short-lived `firebase.r887.governed.json` and its SHA256 receipt without modifying canonical `firebase.json`.
  - The generated configuration must preserve both original existing Functions predeploy hooks in their original order and appends exactly `node scripts/r887-guard-functions-predeploy.mjs --mode verify` **after** the TypeScript compilation hook.
  - `--mode verify`, intended to run within Firebase's actual predeploy hook lifecycle, verifies root and source paths and `GCLOUD_PROJECT`, source and config receipts, exact release identity, then re-checks the previous R883 compiled JS manifest *after* compilation. An altered config, source, or compiled output fails closed. Emits a distinct non-production, non-provider receipt.
- Changed the governed workflow's **Functions deployment only** to invoke `--config firebase.r887.governed.json`. Both Hosting deployments and rollback retain their previous configs, and no implicit modification to `firebase.json` is introduced.
- Added `tests/r887-guard-functions-predeploy.test.mjs` with 9 synthetic temporary-Git-fixture tests and wired them into both original Spatial CI jobs.
- Extended `scripts/r885-release-source-regression.test.mjs` to assert that the Functions deploy uses the governed config and that the explicit provider/backend pre-mutation HOLD remains.

## Test and source evidence

Local exact Node 22 execution: `node --test tests/r887-guard-functions-predeploy.test.mjs` **9/9 PASS**. This tests deterministic local fixture operations, not an actual Firebase CLI packaging/deployment run.

The two committed R887 code blobs are byte-for-byte verified against locally executed files:
- `scripts/r887-guard-functions-predeploy.mjs`: `ca8f370f83b74d1e3554e4aa1ce4e95504a98533`.
- `tests/r887-guard-functions-predeploy.test.mjs`: `4e46b7e471ab8800fc57d65ff6c50bd08860d438`.

The revised workflow and R885 source contract were verified by GitHub source readback but have not been executed as a complete exact-head native CI run. Tests of the Firebase CLI integration itself still require real frozen package installation and an authenticated **nonproduction** dry run in an approved environment.

## Hard limits and remaining P0 blockers

1. This protects **compiled local files immediately after Firebase predeploy**, not the final provider upload archive. The CLI may package an alternate file set or generate or mutate files after predeploy. Independently derive a packaging manifest from exactly the archive/content that Firebase submits and reconcile with provider revision/image digest.
2. R887 intentionally cannot deploy: the separate `Re-prove exact deployment boundary` workflow step still `exit 1` before the first production mutation, reflecting unproven previous backend revisions and rollback equivalence.
3. WIF service account used by the current controller is a deployer; read-only endpoint requests do not establish least-privilege read-only authorization.
4. Need full exact-head native CI (prior runs failed; no root cause established from unavailable job logs), authenticated provider site/domain and live-channel readback, Functions/Cloud Run revisions, source-to-deployed identity, owner-positive signed consent/Jobs/Studio/Replay/deletion integration and device/XR accessibility acceptance.
5. Independent controller security-owner review is required to confirm that Firebase CLI sets the expected `PROJECT_DIR`, `RESOURCE_DIR`, `GCLOUD_PROJECT` in the actual hook context. R887 deliberately fails closed if any is missing or unexpected.
6. The guarded release config and temporary evidence files must be preserved in CI artifacts and reviewed; no authorization can derive from source-only checks.

No live Firebase, billing, IAM, user memory, GitHub main, or production operations were performed during R887 source admission.
