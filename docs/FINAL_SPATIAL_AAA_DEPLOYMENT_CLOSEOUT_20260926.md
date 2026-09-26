# Final Spatial AAA Deployment Closeout - 2026-09-26

## Current Authority

- Spatial main: `4b3c7bd982865324510eb9581d9f324bd4ad6e93`
- PR #1325 pixel lane: open draft, mergeable, branch `fix/focus-mounted-realm-proof-20260926`, head `2f7af37e0e234629d9d8261d19f778205c41f7e5`
- PR #1343 asset lane: open draft, mergeable, branch `agent/parallel-aaa-asset-handoff-20260926`, head `3a9ddc8d5e3e81ec375f662e0ffb34677869d622`
- PR #1343 base: `main`
- PR #1343 changed files at closeout inspection: 47
- Active Spatial fallback GLTF changes in PR #1343: 0
- Candidate GLBs isolated in PR #1343: 8

## Public-Safe Receipts And Manifests

- Final pixel-agent handoff queue: `docs/assets/PARALLEL_AAA_SPATIAL_HANDOFF_QUEUE_20260926.md`
- Candidate package receipt: `operations/assets/generated-receipts/parallel-aaa-20260926-candidate-pack.json`
- Canonical Spatial reference manifest: `urai-tier1/public/assets/urai/spatial/asset-forge-manifest.json`
- Provider verification evidence: `release-control-evidence/provider-asset-verification.json`
- Asset verification report: `docs/ASSET_VERIFICATION_REPORT.md`

## Complete

- PR #1343 preserves the Spatial pixel lane by keeping active `/spatial/**/*.gltf` fallback changes at zero.
- The generated launch-critical candidate GLBs remain isolated under `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/`.
- The final handoff queue identifies the exact candidate artifact, hash, target scene, state, integration note, and limitation for each package.
- Shared spatial material/particle support and the Home XR navmesh are documented as integration support, not model replacements.
- Private captured-reality source evidence is recorded outside public GitHub.

## Integrated Or Ready For Integration

- Shared material and particle support files are ready for Spatial integration as support assets.
- Home platform navmesh is ready for Spatial integration after Home/XR scene ownership frees.
- The eight generated GLB artifacts are real candidate artifacts ready for review, not active runtime replacements.

## Candidate-Only

The following packages are candidate-only until the pixel lane or a later integration PR accepts them visually:

- `home-entry-chamber-v1`
- `ground-world-terrain-v1`
- `life-map-memory-star-v1`
- `focus-memory-chamber-v1`
- `replay-memory-environment-v1`
- `urai-orb-avatar-v1`
- `portal-ring-master-v1`
- `passport-status-room-v1`

## Private / Intentionally Not Published

- Private captured-reality source filenames, Drive identifiers, family/source media details, and raw media metadata are intentionally not included in public GitHub.
- The private captured-reality receipt remains in Google Drive.
- No secrets, API keys, provider credentials, or private media identifiers are published in this closeout.

## Captured Reality Truth State

- Real captured input: found in private Drive evidence.
- Real reconstruction: not created yet.
- Synthetic demo represented as real: no.
- Current blocker: raw private captured sources need ordered proxy or split derivatives under the connector transfer limit, or another approved ingestion path.
- Next step after unblock: ingest derivatives, validate provenance, reconstruct/train, clean, optimize, package, and performance-test.

## Gaussian Splat Truth State

- Native real Gaussian splat artifact: not created in this pass.
- Reason: real captured source derivatives are not yet ingestible in this environment.
- Splat contracts and captured-reality workflow contracts pass locally.
- Public status: blocked on private derivative creation, not blocked on unknown source existence.

## Provider / Candidate Forge / Model Forge Status (live provider integration not claimed)

- Provider evidence file exists and verifies 51/51 core records.
- Provider handoff still reports 7/8 route owners because the Home active-owner marker is missing from pixel-owned Home files.
- This branch does not patch the Home marker because PR #1325 owns active scene/pixel finishing.
- Candidate-forge provenance evidence is represented by the candidate pack and asset receipts; live provider integration is not claimed and generated files remain candidate-only.

## Exact-Head Local Test Results

Run on PR #1343 head `3a9ddc8d5e3e81ec375f662e0ffb34677869d622`.

| Check | Result | Notes |
| --- | --- | --- |
| `node scripts/check-spatial-asset-forge.mjs` | PASS | 20 assets checked |
| `node urai-tier1/scripts/validate-assets.mjs` | PASS | 24 manifest entries; 0 blocking ready/fallback failures |
| `node scripts/verify-production-sensory-assets.mjs` | PASS | production audio verified |
| `node --test tests/field-reconstruction-phase5-contract.test.mjs` | PASS | captured-reality contract |
| `node --test urai-tier1/tests/crowdfunding-capture-authority-contract.test.mjs` | PASS | capture authority contract |
| `node --test urai-tier1/tests/firebase-hosting-capture-workflow-contract.test.mjs` | PASS | Firebase hosting capture workflow |
| `node scripts/verify-provider-asset-handoff.mjs` | FAIL, preserved | Only failure is Home active-owner marker owned by pixel scene lane |

## PR #1343 Workflow State

At closeout inspection for head `3a9ddc8d5e3e81ec375f662e0ffb34677869d622`:

- Queued workflows: 28
- Pending workflows: 2
- Failed workflows: 0
- Combined status API returned no terminal statuses.

## Deployment And Live Proof Status

Repository deployment authority remains protected through the existing release workflows and Firebase hosting configuration. The direct production smoke script requires:

- `URAI_DEPLOY_URL`
- `URAI_EXPECTED_DEPLOYED_SHA`
- rollback SHA
- authority SHA

A full exact deployed-SHA certification was not possible in this environment because those deployment/rollback values and protected deployment execution were not available.

Public reachability check through `https://urai.app` observed:

| Route | Result |
| --- | --- |
| `/` | reachable; Home content rendered |
| `/life-map` | reachable; Life Map content rendered |
| `/focus` | reachable; Focus preview content rendered |
| `/replay` | reachable; Replay preview content rendered |
| `/passport` | reachable; Passport content rendered |
| `/privacy` | not accessible through web checker |
| `/settings/privacy` | not accessible through web checker |
| `/spatial/ar-vr` | not accessible through web checker |

This is live reachability evidence, not exact deployed-SHA proof.

## Exact Remaining Blockers

1. PR #1325 remains draft and owns active pixel scene finishing.
2. PR #1343 workflows are queued/pending, not terminal.
3. Provider handoff has one preserved failure in pixel-owned Home active-owner marker.
4. Real captured-reality reconstruction needs smaller private derivatives or another approved ingestion route.
5. Native Gaussian splat output depends on captured-reality ingestion.
6. Protected live deployment proof needs exact deployed SHA, rollback SHA, release authority SHA, and successful protected smoke on `https://urai.app`.
7. `/privacy`, `/settings/privacy`, and `/spatial/ar-vr` need live route verification after deployment authority is available.

## Pixel-Agent Handoff

Use `docs/assets/PARALLEL_AAA_SPATIAL_HANDOFF_QUEUE_20260926.md` as the exact consumption queue.

Do not infer final assets from older contracts. Do not replace pixel-owned active scene files with candidates without visual acceptance and a dedicated integration PR.
