# URAI Workstream B — Phase 2 Consolidation Receipt

Receipt ID: `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012`

Recorded: 2026-07-11

Classification: `SOURCE-CONSOLIDATED / EXECUTION-BLOCKED / NOT DEPLOYED / NOT CERTIFIED`

## Canonical authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical production branch: `main`
- Current canonical main SHA: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Consolidated Phase 2 PR: `#539`
- Consolidated release branch: `release/protected-rollback-authority-20260711-v2`
- Consolidated exact head: `fe90208c8c6774c2e3868bafe52dedb35cf8e815`
- Current PR state: open, draft, mergeable
- Diff against main: 93 commits, 32 changed files, 3,554 additions, 670 deletions

## Incorporated source authorities

The following stacked source repairs were incorporated into the Phase 2 release branch without merging to `main`:

1. `#579` — pre-deploy rollback provenance bound to canonical repository, authority SHA, workflow-run identity, exact response URL and JSON content type.
2. `#552` — isolated target build, clean authority attestation, immutable action pins, protected production credential lifecycle, exact bundle/fingerprint validation and rollback authority.
3. `#578` — live browser/release smoke fails closed on redirect, route/query identity drift, cross-origin requests, browser errors and missing exact deployed SHA.
4. `#577` — asset validation fails closed on missing ready/fallback files, symlinks, path escape, invalid extensions and duplicate asset identity.
5. `#575` — one fail-closed sensory runtime layer, ready-only resolution, abortable loaders, procedural fallbacks, explicit texture disposal, exact sensory receipts and excluded unapproved HDR/audio candidates.

## Final changed-file inventory

The final `#539` candidate changes exactly 32 files:

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

## Exact-head workflow registration

GitHub registered the following pull-request workflow runs against exact head `fe90208c8c6774c2e3868bafe52dedb35cf8e815`:

- Spatial Missing Resource Diagnostics — `29169799134`
- URAI Spatial Release Readiness — `29169799120`
- URAI Spatial Firebase Preview — `29169799118`
- URAI Production Verify — `29169799155`
- Patch Check — `29169799135`
- Launch Critical Asset Forge — `29169799150`
- Guardian Diagnostics — `29169799153`
- Frozen Lockfile Check — `29169799119`
- Export Spatial E2E Source — `29169799126`
- Spatial Performance Budget — `29169799125`
- v60 CI — `29169799127`
- URAI Canonical Production Release — `29169799139`
- XR Static Gate Diagnostics — `29169799144`
- URAI Spatial Copy Policy — `29169799138`
- Release Security Path Guard — `29169799163`
- URAI Spatial Verify — `29169799170`
- URAI Spatial CI — `29169799162`
- Privacy adoption check — `29169799166`
- Workflow Phase Boundaries — `29169799152`

At receipt time all 19 runs were `queued` with no conclusion. Queued registration is not passing evidence.

## Safety and mutation receipt

- Merge to `main`: **not performed**
- Production deployment: **not performed**
- Firebase mutation: **not performed**
- Production credential materialization: **not performed**
- Provider call: **not performed**
- Billing/spend: **none established**
- Asset promotion beyond the reviewed candidate boundary: **not performed**
- Production data mutation: **not performed**

## Remaining terminal gate

The source consolidation work is complete. Production certification remains blocked until all required workflows execute successfully on the unchanged exact head, retained logs/artifacts are available, independent release/security review is recorded, and a protected exact-SHA deployment produces deployed-SHA, rollback-SHA, fingerprint, route/domain and browser receipts.

No statement in this receipt authorizes a public launch or represents the candidate as deployed or certified.
