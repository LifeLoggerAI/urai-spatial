# Last-mile source fixes

Starting SHA for this last-mile continuation: `c0f93cb364a7e2e62ece02ec8cad032165ded759`
Branch: `main`
Evidence level: source update through GitHub connector.

## Safe source fixes completed

### Deploy-proof endpoint

Commit: `e0c7a7d990a11b420d31da4102fc13109750c27e`

Updated `urai-tier1/src/app/api/system/deploy-proof/route.ts` to:

- add `proofSchemaVersion: urai-spatial-deploy-proof-v2-2026-06-30`
- expand public/required smoke routes beyond the old minimal list
- include `/ground`, `/status`, `/privacy-controls`, `/location-map`, focus/replay examples, and `/spatial/ar-vr`
- return claim boundaries for spatial preview, WebXR, Quest, and Life Map data
- return `deploymentFreshness.commitShaKnown` so READY can require a known deployed commit SHA

### Live deploy proof checker

Commit: `896f29b18f5069b3af6e076193880154ab7a207c`

Updated `scripts/check-home-xr-live-deploy-proof.mjs` to:

- smoke `/ground`, `/life-map`, and `/status`
- require the v2 deploy-proof schema marker
- require `commitShaKnown` in the deploy-proof response
- optionally enforce non-unknown live commit SHA when `REQUIRE_LIVE_COMMIT_SHA=true`
- keep stale-copy rejection for launch placeholder, prototype, and placeholder copy

## Validation status

These are safe source/checker changes. Local build/test execution and live deploy verification remain blocked in this connector-only environment and must be run through local shell or GitHub Actions.
