# URAI Workstream B — Phase 2 Consolidation Receipt

Receipt ID: `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012`

Recorded: 2026-07-11

Classification: `SOURCE-CONSOLIDATED / EXECUTION-BLOCKED / NOT DEPLOYED / NOT CERTIFIED`

## Canonical authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical production branch: `main`
- Canonical main SHA: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Consolidated Phase 2 PR: `#539`
- Consolidated branch: `release/protected-rollback-authority-20260711-v2`
- Final audited source head before this receipt: `f5c75129ef36a979accad0bcbe91f48863fe1ae0`
- PR state at recording: open, draft, mergeable
- Candidate inventory: 32 source/control files plus this receipt

## Incorporated authorities

The Phase 2 branch now contains the source work previously isolated in:

1. `#579` — live rollback provenance requires canonical repository, authority SHA, numeric workflow run, direct cache-busted fingerprint URL and JSON content type.
2. `#552` — target-only build, clean authority attestation, credential isolation, immutable action pins, exact bundle/fingerprint validation and protected rollback controls.
3. `#578` — live release smoke requires exact deployed SHA, canonical route/query identity, hydrated identity and retained browser evidence.
4. `#577` — ready/fallback asset validation fails closed on absent, non-regular, unsafe, duplicate or invalid manifest entries.
5. `#575` — one candidate-aware sensory runtime layer with ready-only resolution, abortable/null-safe loading, procedural fallback, explicit texture disposal, mount-relative timing and exact sensory receipts.

These were incorporated into the Phase 2 branch only. Nothing was merged to `main`.

## Final source-audit corrections

A post-consolidation source audit found and repaired four lost hardening blobs before this receipt:

- `urai-tier1/scripts/validate-assets.mjs` now normalizes manifest paths before duplicate detection and uses `realpathSync` to reject symlink-parent escapes outside the canonical public root.
- `urai-tier1/tests/asset-validation-fail-closed-contract.test.mjs` locks normalized collision and physical realpath containment behavior.
- `scripts/urai-release-control-smoke.mjs` now emits schema v5, requires exact requested query entries with no extras, intercepts and aborts noncanonical browser requests before they leave, records every blocked attempt, and fails the receipt if any are observed.
- `urai-tier1/tests/release-control-smoke-boundary-contract.test.mjs` locks request interception, abort behavior, exact query identity and retained failure evidence.

The compact unit runner includes both focused contracts.

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

Every workflow conclusion from `c7c7422d595f7da9330bd4f18f07105767163994`, `fe90208c8c6774c2e3868bafe52dedb35cf8e815`, or any earlier head is stale. Only workflows attached to the receipt-bearing final branch head may gate incorporation or deployment.

Queued registration is not passing evidence.

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

Source consolidation and audit repair are complete. Production certification remains blocked until all required workflows execute successfully on one unchanged exact head, retained logs and artifacts are available, independent release/security and asset review are recorded, the tested SHA is merged without drift, and a protected exact-SHA release produces deployed-SHA, rollback-SHA, fingerprint, route/domain, browser and recovery receipts.
