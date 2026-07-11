# URAI Workstream B — Phase 2 Consolidation Receipt

Receipt ID: `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012`

Recorded: 2026-07-11

Classification: `SOURCE-CONSOLIDATED / CI-REPAIR-APPLIED / NOT DEPLOYED / NOT CERTIFIED`

## Canonical authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical production branch: `main`
- Canonical main SHA: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Consolidated Phase 2 PR: `#539`
- Consolidated branch: `release/protected-rollback-authority-20260711-v2`
- Final audited source head before this receipt: `3ac5dc5b9211fc6ea5fab7c1ad27d2c13f992f2c`
- PR state at recording: open, draft, mergeable
- Candidate inventory: 32 source/control files plus this receipt

## Incorporated authorities

The Phase 2 branch contains the source work previously isolated in:

1. `#579` — repository-, authority-, and workflow-run-bound live rollback provenance.
2. `#552` — target-only build, clean authority attestation, credential isolation, immutable action pins, exact bundle/fingerprint validation and protected rollback controls.
3. `#578` — exact deployed-SHA, route/query identity, hydrated browser and network-boundary evidence.
4. `#577` — fail-closed ready/fallback asset validation.
5. `#575` — candidate-aware sensory runtime and exact sensory evidence.

These authorities were incorporated into the Phase 2 branch only. Nothing was merged to `main`.

## Post-consolidation source corrections

The final source audit preserves:

- normalized manifest-path collision detection;
- physical `realpath` containment against symlink-parent asset escapes;
- exact query-entry equality with no undeclared parameters;
- pre-request interception and abort of noncanonical browser traffic;
- release-smoke schema `urai-release-control-smoke-5`;
- production-authority audit schema `urai-production-authority-audit-5`.

The production-authority audit now explicitly requires the schema-v5 smoke, exact query identity, `context.route` interception, `blockedbyclient` abort behavior and retained blocked-request evidence.

## Previous-head CI finding and repair

GitHub-hosted runner assignment resumed on prior exact head `7fc065c4afa43585516c9619882da7f058ee6c9b`.

Observed terminal results on that stale head:

- XR Static Gate Diagnostics: success.
- Spatial Missing Resource Diagnostics: success.
- Release Security Path Guard: failure in `Audit production workflow authority`.

The failing job proved checkout, clean source identity, Node setup, syntax checks, guard immutability and action-pin verification before failing. The defect was a stale audit assertion that still required release-smoke schema `2` after the consolidated smoke advanced to schema `5`.

The owning audit was repaired on source head `3ac5dc5b9211fc6ea5fab7c1ad27d2c13f992f2c`. Every workflow result from `7fc065c4...` and earlier heads is stale for final gating.

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
