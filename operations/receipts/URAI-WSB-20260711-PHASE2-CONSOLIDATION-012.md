# URAI Workstream B — Phase 2 Consolidation Receipt

Receipt ID: `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012`

Recorded: 2026-07-11

Classification: `SOURCE-CONSOLIDATED / ACTIVE-CI-REPAIR / NOT DEPLOYED / NOT CERTIFIED`

## Canonical authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical production branch: `main`
- Canonical main SHA: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Consolidated Phase 2 PR: `#539`
- Consolidated branch: `release/protected-rollback-authority-20260711-v2`
- Final source head before this receipt: `e2a4bc1923eb041389c18994a9366f5f983b9222`
- PR state at recording: open, draft, mergeable
- Candidate inventory: 32 source/control files plus this receipt

## Incorporated authorities

The Phase 2 branch contains the source work previously isolated in #552, #575, #577, #578 and #579. These authorities were incorporated into the Phase 2 branch only. Nothing was merged to `main`.

## Consolidated source boundaries

The candidate preserves:

- target-only static build and clean authority attestation;
- managed ephemeral production credentials and immutable action pins;
- repository-, authority-, run-, release-, rollback- and fingerprint-bound provenance;
- normalized manifest-path collision detection and physical `realpath` containment;
- exact live route/query/SHA identity;
- pre-request abort of noncanonical browser traffic;
- candidate-aware sensory assets with procedural fallback and explicit disposal.

## CI execution and repairs

GitHub-hosted runner assignment resumed.

On stale head `7fc065c4afa43585516c9619882da7f058ee6c9b`:

- XR Static Gate Diagnostics succeeded;
- Spatial Missing Resource Diagnostics succeeded;
- Release Security Path Guard failed in `Audit production workflow authority`.

The first defect was a stale audit assertion requiring release-control smoke schema `2` after the consolidated smoke advanced to schema `5`.

On stale repaired head `53eb1c7e8c6cf2de5d23d9c6341e112ad1d9b233`:

- XR Static Gate Diagnostics succeeded;
- Spatial Missing Resource Diagnostics succeeded;
- Release Security Path Guard again failed in the authority-audit step after checkout, exact source identity, Node setup, syntax, guard immutability and action-pin verification all passed.

The second defect was reference-based production-workflow detection: the read-only security guard was classified as production-capable merely because it referenced `live-release.mjs` for syntax checking.

The authority audit now:

- detects actual production mutation execution instead of passive path references;
- requires exactly one production mutation script and one production mutation workflow;
- preserves target-build, attestation, credential, fingerprint, rollback, smoke, proof and steering boundaries;
- requires release-control smoke schema `5`, exact query identity and pre-request network blocking;
- emits explicit GitHub annotations for every future failure;
- reports schema `urai-production-authority-audit-6`.

The security workflow keeps immutable checkout/setup-node pins, read-only permissions, exact source identity, all security checks and `fetch-depth: 0`; `show-progress: false` only removes checkout noise so audit diagnostics remain readable.

Every workflow conclusion from `e2a4bc19...` before this receipt, `53eb1c7e...`, `7fc065c4...` and earlier heads is stale for final gating.

## Final changed-file inventory

The consolidated candidate changes exactly 32 non-receipt files:

- `.github/workflows/release-security-path-guard.yml`
- `.github/workflows/spatial-live-deploy.yml`
- `FINAL_PRODUCTION_AUDIT.md`
- `docs/P0_VERIFICATION_CLOSURE_RUNBOOK.md`
- `operations/assets/production-receipts/sensory-layer-v1.json`
- `package.json`
- `scripts/attest-static-release-bundle.mjs`
- `scripts/audit-production-workflow-authority.mjs`
- `scripts/create-static-release-bundle.mjs`
- `scripts/live-release.mjs`
- `scripts/urai-post-deploy-smoke.mjs`
- `scripts/urai-release-control-smoke.mjs`
- `scripts/verify-live-rollback-provenance.mjs`
- `scripts/verify-production-action-pins.mjs`
- `scripts/verify-production-sensory-assets.mjs`
- `scripts/verify-promoted-sensory-assets.mjs`
- `scripts/verify-release-credential-boundary-static.mjs`
- `scripts/verify-release-credential-boundary.mjs`
- `scripts/verify-release-security-path-guard.mjs`
- `scripts/write-release-fingerprint.mjs`
- `urai-tier1/public/assets/urai/generated/textures/global-cinematic-material-pack-v1.json`
- `urai-tier1/scripts/run-unit-contract-tests-compact.mjs`
- `urai-tier1/scripts/run-unit-contract-tests.mjs`
- `urai-tier1/scripts/validate-assets.mjs`
- `urai-tier1/src/spatial/assets/sensoryAssetManifest.ts`
- `urai-tier1/src/spatial/scene/SpatialSensoryLayer.tsx`
- `urai-tier1/src/spatial/scene/SpatialWorldAssetLayer.tsx`
- `urai-tier1/tests/asset-validation-fail-closed-contract.test.mjs`
- `urai-tier1/tests/exact-static-release-contract.test.mjs`
- `urai-tier1/tests/release-control-smoke-boundary-contract.test.mjs`
- `urai-tier1/tests/sensory-asset-resolution-contract.test.mjs`
- `urai-tier1/tests/unit-runner-coverage.test.mjs`

## Evidence rule

Only workflows attached to the receipt-bearing final branch head may gate incorporation or deployment. Queued, skipped, cancelled, stale-head or different-head results are not passing evidence.

## Mutation receipt

- Merge to `main`: not performed
- Production deployment or rollback: not performed
- Firebase or production-data mutation: not performed
- Production credential materialization: not performed
- Provider call: not performed
- Billing/spend: none established
- Asset promotion beyond the reviewed candidate boundary: not performed
- Public launch or certification: not authorized

## Remaining terminal gate

Production certification remains blocked until all required workflows execute successfully on one unchanged exact head, retained logs and artifacts are available, independent release/security and asset review are recorded, the tested SHA is merged without drift, and a protected exact-SHA release produces deployed-SHA, rollback-SHA, fingerprint, route/domain, browser and recovery receipts.
