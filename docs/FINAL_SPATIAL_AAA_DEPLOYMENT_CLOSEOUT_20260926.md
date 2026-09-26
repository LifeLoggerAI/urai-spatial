# UrAi Spatial / AAA / Captured Reality Closeout

**Recorded:** 2026-09-26 UTC  
**Scope:** public-safe documentation, exact-head evidence, candidate boundaries, live route readback, deployment readiness, and handoff.  
**Release status:** NOT RELEASE-CERTIFIED. This record does not authorize merge, provider spend, production mutation, or publication of private source material.

## 1. Current authority

| Item | Current truth |
| --- | --- |
| Repository | [LifeLoggerAI/urai-spatial](https://github.com/LifeLoggerAI/urai-spatial) |
| main | `4b3c7bd982865324510eb9581d9f324bd4ad6e93` |
| PR #1325 | Open, draft, mergeable; head `33bc2209f37c3628592e772b631e497d713aa1dc`; pixel/scene-owned; advanced by the pixel agent after the prior closeout snapshot |
| PR #1343 | Open, draft, mergeable; head `02069d06bb14203e25502de4af0aa197abda9eed`; isolated AAA candidate lane |
| Documentation branch | `docs/final-spatial-aaa-deployment-closeout-20260926`, based on current main |
| Production mutation | Not performed by this closeout |

PR #1325 and PR #1343 are independent candidate lanes. Evidence does not transfer between heads.

## 2. Complete in this closeout

- Fresh main, PR, changed-file, review-thread, workflow, and private-receipt reads.
- Public-safe closeout documentation.
- Exact current PR #1343 candidate boundary verification.
- Read-only inspection of PR #1325 checks, failures, and deployment awareness.
- Live browser readback of all requested public routes on `https://urai.app`.
- Private captured-reality receipt existence and truth-state verification.
- Final handoff and blocker classification.

## 3. Integrated versus candidate-only

### Integrated/current reference state

- Existing canonical Spatial fallback GLTF references remain the active reference layer.
- The PR #1343 asset-forge manifest explicitly marks model entries as canonical fallback references.
- Production sensory verification has a passing recorded result for the current asset lane.
- Candidate governance and captured-reality contract files are present in the scoped lanes.

### Candidate-only

PR #1343 contains eight candidate GLBs under:

`urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/`

The candidates are:

- Home entry chamber
- Ground terrain
- Life Map memory star
- Focus memory chamber
- Replay memory environment
- UrAi Orb avatar
- Portal ring
- Passport status room

They are not active replacements. No active `urai-tier1/public/assets/urai/spatial/**/*.gltf` file is changed by PR #1343. Candidate promotion still requires scene-owner review, literal visual acceptance, compression/performance acceptance, and exact-head proof.

## 4. PR #1343 status

Current head: `02069d06bb14203e25502de4af0aa197abda9eed`.

Changed-file inspection confirms:

- 48 changed paths are present in the current PR diff.
- Eight isolated candidate GLBs are present.
- The handoff queue exists at [docs/assets/PARALLEL_AAA_SPATIAL_HANDOFF_QUEUE_20260926.md](../docs/assets/PARALLEL_AAA_SPATIAL_HANDOFF_QUEUE_20260926.md).
- Active Spatial fallback GLTF changes: zero.
- Candidate manifest, receipts, shared support textures/particles, navmesh support, and contract tests remain isolated from pixel-owned scene files.
- The latest head is the current concurrent asset-lane authority; it advanced after the initial closeout snapshot and was re-read without overwriting it.

Current exact-head Actions snapshot:

- 33 workflow runs observed on the repaired current head.
- 33 queued at the latest readback.
- 0 completed conclusions on the repaired current-head page.
- The asset-lane repair commit added candidate-only rehearsal decisions, a deterministic forge dependency, and deferred/not-live copy wording; no candidate was promoted.
- No current-head green release certification is established while the required workflows remain queued/pending.

The three older inline review threads were outdated and are now resolved. They identified prior candidate/canonical receipt mixing and active-fallback geometry concerns; later comments reported repairs. Resolution is not current-head approval.

## 5. PR #1325 preservation and inspection

PR #1325 remains untouched by this closeout.

- State: open draft, mergeable.
- Head: `33bc2209f37c3628592e772b631e497d713aa1dc`.
- No files from its pixel-owned lane were modified.
- The Home active-owner marker remains the known provider-handoff blocker:
  `data-home-visible-world="final-physical-sanctuary-memory-rooms"`.
- Fresh exact-head workflow snapshot for `33bc2209f37c3628592e772b631e497d713aa1dc`: 18 runs; 17 queued, 1 pending, 0 completed conclusions.
- Historical failed-run logs from the superseded pixel head `2f7af37e0e234629d9d8261d19f778205c41f7e5` were read-only inspected. They included the Home State Proof Orb-open lifecycle-signature mismatch, a Continuous Spatial Visual Proof desktop browser-proof failure after artifact upload, and Accessibility Performance Evidence failures. Those failures remain lane-owned; the new head `33bc2209f37c3628592e772b631e497d713aa1dc` has fresh workflows queued/pending.

The pixel agent's exact handoff remains:

1. Restore/prove the Home active-owner marker.
2. Re-run Home, Portal/Orb, accessibility, visual, performance, and canonical journey evidence on the final pixel head.
3. Reconcile any asset receipt mismatch only within the pixel-owned branch if that branch chooses to do so.
4. Publish exact-head evidence before merge/deployment decisions.

## 6. Tests and verification

### Recorded passing evidence

The latest published PR #1343 closeout comments record these passes on the then-exact asset heads:

- `node scripts/check-spatial-asset-forge.mjs` — PASS; 20 assets checked.
- `node urai-tier1/scripts/validate-assets.mjs` — PASS; 24 manifest entries, 0 blocking ready/fallback failures.
- `node scripts/verify-production-sensory-assets.mjs` — PASS; production audio verified.
- `node --test tests/field-reconstruction-phase5-contract.test.mjs` — PASS.
- `node --test urai-tier1/tests/crowdfunding-capture-authority-contract.test.mjs` — PASS.
- `node --test urai-tier1/tests/firebase-hosting-capture-workflow-contract.test.mjs` — PASS.

These results are recorded evidence for their cited heads, not automatic certification of a later head.

### Current-head test boundary

The current #1343 head has queued remote workflows and therefore does not yet have a complete green exact-head test receipt.

The current provider/asset verification receipt reports:

- 53 records total.
- 51 core records verified and registered.
- 7 of 8 route owners verified.
- Overall result: false.
- Sole listed route-owner failure: the Home active-owner marker owned by the pixel lane.

### PR #1325 failed evidence

- Launch Critical Asset Forge: failed on the pixel head because the Passport status-room receipt did not match the manifest fallback, source, and target routes.
- Portal and Orb Exact Proof: five contract subtests passed and the artifact uploaded, but the browser proof command exited nonzero after a long-running capture. No patch was made.

## 7. Live deployment / route readback

A live browser readback was performed against `https://urai.app` on 2026-09-26 UTC.

| Route | Readback |
| --- | --- |
| `/` | PASS — URAI Home rendered |
| `/life-map` | PASS — Life Map rendered |
| `/focus` | PASS — truthful no-selected-memory fallback rendered |
| `/replay` | PASS — truthful no-selected-memory fallback rendered |
| `/passport` | PASS — Ownership Vault rendered with unconfigured-service state |
| `/privacy` | PASS — privacy/data-boundary surface rendered |
| `/settings/privacy` | PASS — legacy privacy shim rendered |
| `/spatial/ar-vr` | PASS — accessible XR fallback/entry surface rendered |

This proves public route reachability and visible page rendering only. The browser evidence surface did not expose numeric HTTP status codes. It does not prove that PR #1325 or #1343 is deployed, that production matches either candidate, or that AAA+++ visual acceptance is complete.

A fresh direct HTTP probe from the closeout environment recorded:

| Route | HTTP result |
| --- | --- |
| `/` | 200 |
| `/life-map` | 200 |
| `/focus` | 200 |
| `/replay` | 200 |
| `/passport` | 200 |
| `/privacy` | 200 |
| `/settings/privacy` | 404 |
| `/spatial/ar-vr` | no site status captured; the probe timed out at the network proxy |

The browser-rendering readback and direct HTTP probe therefore do not agree for the last two routes. They are not treated as certified canonical live routes until the authorized deployment owner verifies them from the deployment environment.

No safe merge-and-deploy action was taken because both relevant PRs remain drafts, exact-head acceptance is incomplete, and current release workflows are not green.

## 8. Captured Reality and Gaussian splat truth

- The private Google Drive receipt titled **URAI Captured Reality Private Source Receipt - 2026-09-26** exists and remains private.
- Real captured input: found.
- Real source-backed reconstruction: not created.
- Native production Gaussian splat: not created or verified.
- Synthetic/demo geometry is not represented as captured reality.
- The current ingestion blocker is transfer size: the known original source material exceeds the available connector download limit.
- The smallest unblock is an ordered proxy or split-derivative package below the transfer limit, with private source linkage retained in Drive.
- After ingestion, the required sequence is provenance validation, reconstruction/splat training, cleanup, archival output, runtime splat packaging, collision/LOD variants, and device/performance proof.
- No private filenames, private IDs, family/source details, or secrets are published here.

## 9. Provider / Candidate Forge / Model Forge (live provider integration not claimed)

- PR #1343 is the isolated candidate handoff, not provider-backed AAA+++ acceptance.
- Candidate-forge outputs are retained under the generated candidate root and are explicitly prevented from becoming production authority; live provider integration is not claimed.
- The canonical Spatial manifest points active model entries to existing fallback assets.
- Model Forge/provider outputs remain candidate evidence until provider identity, licensing, compression, bounds, visual quality, route ownership, and exact-head acceptance are recorded.
- No provider LIVE activation or production spend is claimed by this closeout.
- The current provider handoff failure is the Home active-owner marker, which belongs to the pixel lane.

## 10. Exact remaining blockers

1. PR #1325 must finish its pixel-owned Home/Focus/Portal/Orb/accessibility/visual/performance exact-head proof.
2. The Home active-owner marker must be restored and reverified on the final pixel head.
3. PR #1343 must receive complete green exact-head workflow evidence; queued/cancelled is not release proof.
4. Independent exact-head review and governance approval are still required.
5. Candidate GLBs need scene-integrated visual acceptance before any promotion.
6. Final licensed/provider-backed AAA+++ assets are not yet accepted as production Gold Masters.
7. Captured-reality derivatives or an approved alternate ingestion route are required.
8. A real captured-place reconstruction and native Gaussian splat must be produced and verified before claiming that capability.
9. One accepted frozen head must be protected-merged, deployed through the authorized hosting path, and rechecked for live revision parity.
10. Live route reachability must be followed by deployed-revision, fingerprint, browser-journey, accessibility, performance, and device evidence.

## 11. Handoff queue

The authoritative sanitized queue is:

- [PARALLEL_AAA_SPATIAL_HANDOFF_QUEUE_20260926.md](../docs/assets/PARALLEL_AAA_SPATIAL_HANDOFF_QUEUE_20260926.md)
- [PARALLEL_AAA_ASSET_HANDOFF_20260926.md](../docs/assets/PARALLEL_AAA_ASSET_HANDOFF_20260926.md)
- [parallel-aaa-asset-handoff-20260926.json](../docs/assets/parallel-aaa-asset-handoff-20260926.json)
- [parallel-aaa-20260926-candidate-pack.json](../operations/assets/generated-receipts/parallel-aaa-20260926-candidate-pack.json)
- [asset-forge-manifest.json](../urai-tier1/public/assets/urai/spatial/asset-forge-manifest.json)
- [provider-asset-verification.json](../release-control-evidence/provider-asset-verification.json)

The queue is ready for the pixel agent to consume after its owned files are frozen. It does not authorize direct edits to pixel-owned scene files.

## 12. Deployment handoff

The next authorized release sequence is:

1. Freeze and approve one exact pixel/canon head.
2. Rebase or reconcile isolated asset candidates without changing pixel ownership.
3. Complete exact-head workflows and independent review.
4. Merge only the accepted head through repository governance.
5. Trigger the authorized Firebase/hosting deployment path.
6. Record deployment URL, deployed revision/fingerprint, route status, and browser proof.
7. Re-run canonical journey, accessibility, performance, asset, provider, and privacy proof against the deployed revision.
8. Update the private Drive receipt only with private-source progress; keep public GitHub sanitized.

## Public disclosure boundary

This file intentionally excludes private Drive IDs, private family/source filenames, private source-media details, credentials, and secrets. The private captured-reality receipt remains the authority for those details.
