# URAI Spatial Status

Canonical status: active canonical public spatial application repository.

Runtime app root: `urai-tier1`.

Canonical public application: `LifeLoggerAI/urai-spatial/urai-tier1` on `main`.

Current release lane: PR #1072 (`agent/home-life-map-final-production-20260809`) was squash-merged on 2026-08-11. Final PR head: `a417d33a70687b75f22be7e97a8c6baf25f4e190`. Merge commit: `a58628601b3cb257ed81d93b6089a1f482484630`. A post-merge certification correction lane is required until all release-critical proof is green and production is independently verified.

Production-live status: **not yet verified**. The canonical custom domain is not presently proven healthy, and production certification remains blocked until the exact shipped `main` SHA is deployed through the protected production workflow and independently verified live.

## Current verified source and asset posture

- Home source is owned by authored three-dimensional sanctuary geometry; the retained replay/provider image is atmospheric support only. This source posture is not itself final visual acceptance.
- The retained V1-V5 runtime image estate is complete: **213 ready / 0 missing** (`53 + 80 + 14 + 39 + 27`).
- Seven launch-critical model assets are recorded as promoted with zero pending in `docs/release-evidence/SPATIAL_ASSET_COMPLETION_LEDGER_2026-08-01.json`.
- The paid V2-V5 provider program is complete at the asset-promotion layer: **151 generated / 151 passed / 0 failed**, with `promotionAuthorized: true`, in `docs/release-evidence/URAI-SPATIAL-20260730-V2-V5-EXACT-PAID-PROMOTION.json`.
- Duplicate paid regeneration is not authorized merely to satisfy stale status text; accepted retained hashes should remain stable unless a real product defect requires replacement.
- AR/WebXR, physical Quest/device certification, wearable/body-signal providers, and other provider/device claims remain separately evidence-gated. Asset presence does not certify those claims.

## Current release boundary

The merged #1072 source must not be declared production-certified from PR verification alone. The post-merge correction/certification lane must resolve every remaining release-critical failure, freeze one successor exact head if source changes are required, and preserve exact-head evidence.

Required release progression remains:

1. repair any remaining release-critical source/proof defects without weakening gates;
2. freeze one exact candidate SHA;
3. obtain all applicable exact-head non-human CI/proof gates;
4. directly inspect desktop, portrait-mobile, movement/proximity, Orb, Ground, Life Map, Focus, Replay, Passport, Location Map, and reduced-motion proof;
5. satisfy the applicable exact-SHA visual/steward/governance acceptance;
6. merge any corrective PR without head drift;
7. deploy only through `.github/workflows/spatial-live-deploy.yml` on `main` using its live manual contract;
8. independently verify production, deployed SHA, core routes/interactions, and rollback provenance before declaring DONE-DONE.

The canonical production workflow's normal deploy contract is a manual `workflow_dispatch` on `main` with:

- `release_sha`: exact current `main` release SHA;
- `rollback_sha`: a distinct proven ancestor/recovery SHA;
- `confirm`: `DEPLOY_URAI_APP`.

Preview deployments, PR verification runs, queued checks, or intermediate receipts are not production completion.

## Version posture

| Version | Asset/runtime posture | Certification posture |
| --- | --- | --- |
| V1 | 53 retained runtime images ready; canonical route/runtime owners and launch-critical models exist. | Not production-certified until final exact-head release, deploy, and live verification complete. |
| V2 | 80 runtime images ready / 0 missing; 71 paid generated replacements plus 9 preserved certified sources. | Asset promotion complete; production behavior still requires the applicable runtime, privacy, release, and live proof. |
| V3 | 14 runtime images ready / 0 missing; paid generation passed. | Asset promotion complete; relationship/pattern behavior remains consent/privacy/live-proof gated. |
| V4 | 39 runtime images ready / 0 missing; paid generation passed. | WebXR/browser/device certification remains separate; no physical Quest claim without device evidence. |
| V5 | 27 runtime images ready / 0 missing; paid generation passed. | Asset availability does not by itself certify Mirror/legacy/provenance/privacy behavior or production deployment. |

## Authority

`urai-spatial` owns the canonical public immersive application at `https://urai.app`: spatial Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Privacy Controls, Location Map, Status, Orb navigation, privacy-safe fallback behavior, and gated AR/VR/WebXR expansion work.

Historical receipts remain historical. New exact-head evidence supersedes older candidate evidence for release acceptance but must not rewrite what earlier receipts proved at the time.

## Done definition

Do not mark this repository production-live until all applicable evidence is recorded for the shipped SHA, including frozen dependencies, source integrity, exact-head CI/proof, direct rendered-product inspection, applicable exact-SHA acceptance/governance authorization, protected production deployment, live route/interaction verification, asset/audio loading, privacy controls, rollback viability, canonical Drive receipt update, and closure of controlling release blockers.
