# ONE URAI GENESIS - R888 EXACT-SOURCE NEXT CHALK HANDOFF

**Prepared:** 2026-11-07, Central time. **Classification:** HANDOFF / SOURCE REVIEW; **PRODUCTION HOLD**.

This handoff is for the next Chalk engineering worker when the current ChatGPT conversation closes. It preserves the verified source checkpoints and explicit evidence limitations of the R879-R887 Spatial release-safety work. It is NOT an all-repository byte inventory, integration certificate, device test, provider verification, launch approval, or permission to mutate production. The founder built actual LifeLogger, LifeOS, and UrAi systems; do not describe the underlying implementations as merely attempted.

## 1. OPEN THESE FIRST - AUTHORITIES AND CONCURRENCY

1. Shared Genesis registry: https://github.com/LifeLoggerAI/urai-labs-llc/pull/262 - review branch `docs/genesis-estate-registry-20261106`. Observed 2026-11-07 source HEAD `a1a8cdc620efe035135aa28270d7b3a81bc61c38`. Read `docs/estate/00_START_HERE.md`, `docs/estate/WORKER_PROTOCOL.md`, `docs/estate/WORKER_INBOX.md` before changes. The central registry is a draft review lane, not production release authority.
2. Original Spatial release controller: https://github.com/LifeLoggerAI/urai-spatial/pull/1636 - branch `repair/release-closure-integration-20261007`, exact HEAD `4ae01987a0664266642faecad68a1eea0f5b881f` at the checkpoint, draft/unmerged.
3. This worker's Spatial safety review: https://github.com/LifeLoggerAI/urai-spatial/pull/2073 - branch `review/chalk-r885-wif-release-safety-20261107`, base branch is the controller branch above, NOT `main`. Immediately before this handoff file the HEAD was `776054710387e56039d51997532421b507aef497` (R887). The creation of the R888 handoff commit advances that HEAD; always re-read PR #2073's current head from GitHub. Draft/unmerged. Before handoff the delta against its intended base was 13 files / 29 commits. Do not squash or overwrite someone else's work.
4. Other independent Spatial Focus/navigation worker: https://github.com/LifeLoggerAI/urai-spatial/pull/2072 - observed head `3919023539674e152caf7c7c2a568947980568d3` and base `review/chalk-r850-real-device-browser-release-gate-20261106`. This is a moving independent PR; do not edit, reset, or merge it during release review.
5. Prior reviewed source notes live in PR #2073 at `docs/estate/R885_RELEASE_SAFETY_SOURCE_ADMISSION.md`, `docs/estate/R886_BUILD_CLOSURE_AND_ROLLBACK_AUDIT.md`, and `docs/estate/R887_FIREBASE_PREDEPLOY_BUILD_CUSTODY.md`. Read them fully, not snippets. Recheck PR histories and any current workers' comments.

The founder cannot use interactive 2FA on the original GitHub account. The connected GitHub tool works for authorized read and review-branch operations. No paid compute, billing recovery, production deploy, live Firebase write, CI dispatch, IAM mutation, main merge, or positive-consent issuance was authorized by this handoff.

## 2. EXACT SOURCE EVIDENCE LEDGER - PR #2073 (PRE-R888 COMMIT)

Repository `LifeLoggerAI/urai-spatial`; Git ref `776054710387e56039d51997532421b507aef497`, before the R888 document. These are Git *blob object* SHA-1 IDs, NOT independently generated content SHA-256 or proof of a complete repository scan.

| Path | Git blob SHA | Lines |
| --- | --- | ---: |
| `.github/workflows/spatial-governed-wif-deploy.yml` | `75430421001d960da5d67c325c0f6c927bdc0bd4` | 585 |
| `.github/workflows/urai-spatial-ci.yml` | `879d46116291e78ec229226ed65120d3d69ae920` | 405 |
| `docs/estate/R885_RELEASE_SAFETY_SOURCE_ADMISSION.md` | `6997d71c76b25b07548a3c59930c0e54ceb45836` | 50 |
| `docs/estate/R886_BUILD_CLOSURE_AND_ROLLBACK_AUDIT.md` | `de1a854704a5e53d704e84787060013c73f2a6f9` | 37 |
| `docs/estate/R887_FIREBASE_PREDEPLOY_BUILD_CUSTODY.md` | `3e871f5b7711070d66c59bb90a13b2cdec205841` | 43 |
| `scripts/R882_PROVIDER_LIVE_SITE_COLLECTOR.py` | `197db54a7588ad9aad33fd8151b1d75a405e0cbf` | 270 |
| `scripts/R883_VERIFY_FUNCTIONS_BUILD.mjs` | `6610cdccf4d2019ae4730ac663ea5d2317e47876` | 87 |
| `scripts/R883_VERIFY_HOSTING_ARTIFACTS.mjs` | `66402169590bc844a5d0dfd6027d4a28d3aa52b7` | 162 |
| `scripts/r885-release-source-regression.test.mjs` | `9726875b0b926a846925733459d670485768a220` | 78 |
| `scripts/r886-functions-input-closure.test.mjs` | `d16f1899dba925b8d3f4aa80d0cda37cec53f8fa` | 67 |
| `scripts/r887-guard-functions-predeploy.mjs` | `ca8f370f83b74d1e3554e4aa1ce4e95504a98533` | 152 |
| `scripts/urai-post-deploy-smoke.mjs` | `b23b3d749875fabd9a5b3a0eb00d4f072d81d6a4` | 354 |
| `tests/r887-guard-functions-predeploy.test.mjs` | `4e46b7e471ab8800fc57d65ff6c50bd08860d438` | 105 |

Additional pinned unchanged project files at that ref:
- Canonical Firebase config `firebase.json` Git blob `340145f0a234fca558a22284d08bbdf6d4af3a10`.
- Existing export namespace guard `scripts/check-spatial-export-deployment-boundary.mjs` Git blob `03e8813a7f4194a97e707d087bbe2b0a2e9760c3`.
- `apps/functions/tsconfig.json` Git blob `d7fe34f80928d50a74720c4e81631fd0d1c46871`; includes both Functions `src/**/*.ts` and `../../packages/tier-locks/src/**/*.ts`.
- `apps/functions/package.json` Git blob `672b7855629d376b643f23944fb4e28a1d556478`.
- `.firebaserc` Git blob `0d4fc68d65f23254829cc0502621a6ffe2215788`.
- `firebase.static.json` Git blob `3bf2e673913b70ef513a794017bac255679b7383` (inherited release config).

No claim is made that every repository path, historical tag/branch, LFS asset, object byte, service revision, binary artifact, or production data has been inventoried.

## 3. WHAT THE PREVIOUS ROUNDS ACTUALLY IMPLEMENTED

- **R879**: The protected API postdeploy smoke now disallows HTTP 5xx as a successful security/availability response (`response.status < 500`, replacing `< 600`). This is a source correction, not live API acceptance.
- **R880**: Rollback release fingerprint must be certified and match independently expected repository/project/release/authority fields. Missing/invalid fingerprint is a refusal, not permissible fallback. Redirect-following was removed for fingerprint retrieval.
- **R881**: Premerge PR-head governance identity and the *distinct merged-main* commit SHA/current `main` ref plus independent `main` CI are required. Exact merged-main CI still needs actual successful runtime evidence.
- **R882**: Read-only Firebase Hosting project/site/custom-domain collector checks domain ownership, explicit project/site identity, paginated **live-channel** releases, and fail-closed ambiguity. Its GET-only implementation does not prove the WIF deployer credential is least privilege. No authenticated provider readback is certified.
- **R883**: Functions build-input + compiled-output attestation and immediate pending/certified Hosting-file custody checks added to release workflow; existing rollback failure conditions account for new gates. Source-level verifier fixtures are not proof of provider-deployed bytes.
- **R884**: Additional offline source gate auditor/forensic package, not provider certification. Previous package artifacts live in this conversation's ChatGPT file library, including `R884_URAI_GENESIS_REVIEW_PACKAGE.zip`, `R884_RELEASE_GATE_AUDITOR.py`, and handoff/evidence ledger files. Do not represent synthetic checks as a full app build.
- **R885**: Opened draft Spatial PR #2073 on an isolated branch based on controller #1636, with the above fail-closed source gates, explicit hard production HOLD and source regression checks integrated into the Spatial CI YAML. It is now a 13-file delta, not an attempt to replace `main`.
- **R886**: Added the immutable `packages/tier-locks/package.json` blob to Functions source-input closure and a 3-case temporary Git regression suite. Replaced the rollback *postrestore first-page* (`pageSize=100`) readback with the full paginated domain-owned live-channel collector. Wired new tests into both CI jobs. Source-change and test evidence remain offline-only.
- **R887**: Root defect: original `firebase.json` Functions predeploy hooks run `node scripts/check-spatial-export-deployment-boundary.mjs` and `pnpm --filter urai-functions build` after an earlier compiled-byte attestation; Firebase can therefore change compiled files *after* the original check. R887 adds `scripts/r887-guard-functions-predeploy.mjs`, which creates `firebase.r887.governed.json` without changing canonical config, preserves the original hooks in order and appends final `--mode verify` to recompare compiled files immediately after Firebase's build. The governed Functions deployment uses this temporary config. Added 9 synthetic tests and new source regression; both normal Spatial CI jobs reference the suite. The R887 code/test Git blobs above were reported byte-identical to locally executed files. This DOES NOT certify the eventual Firebase CLI upload archive or provider Cloud Run revision/image digest.

**Mandatory explicit failure remains** in `.github/workflows/spatial-governed-wif-deploy.yml`, in step `Re-prove exact deployment boundary`, BEFORE provider mutation:

```
echo 'HOLD: protected backend revision and rollback equivalence not certified.' >&2
exit 1
```

**Do not remove or bypass that stop** solely because tests pass. All PR/source review is strictly prelaunch.

## 4. TEST RESULTS, EXACT STRENGTH, AND FAILED NATIVE CI

Previous-turn/local tests documented and reported, NOT independently rerun in this R888 handoff:
- R882 site collector synthetic fixtures: **30/30 PASS**.
- R883 Hosting custody synthetic fixtures: **25/25 PASS**.
- R884 source auditor synthetic fixtures: **28/28 PASS**.
- R886 expanded Functions source closure fixtures: **14/14 PASS**.
- R886 new temporary-Git fixture tests: **3/3 PASS**.
- R887 guarded Firebase postpredeploy fixtures: **9/9 PASS** using Node 22.
- R885 source guard review: static readback asserted presence; do not assert completed test-suite run without exact runner evidence. Likewise there is NO full clean checkout native test certificate, and prior independent R879-R883 fixture counts can overlap across revisions. Do not add them into a misleading global certified-test count.

The claimed command included in both Spatial CI jobs is:

```
node --test scripts/r885-release-source-regression.test.mjs scripts/r886-functions-input-closure.test.mjs tests/r887-guard-functions-predeploy.test.mjs
```

**Current observed CI FAILURE** at prehandoff SHA `776054710387e56039d51997532421b507aef497`:
- `URAI Spatial CI`, Actions run `42433330542`: `completed/failure`.
- `Frozen Lockfile Check`, Actions run `42433330403`: `completed/failure`.
- First-page tool readback returned 12 failed PR workflow runs at this same SHA; ordinary commit combined status returned no individual status checks.
- Prior R887 head `2c91582b1054a1343c592bcfb1dd0e0dfb8fbcd2`: `URAI Spatial CI` run `42433296911` also failed, seven jobs failed without usable step detail. Previous job log requests failed with `BlobNotFound`; root cause not established. This does NOT prove source code caused the failure and does NOT prove billing/Actions suspension; do not infer either without additional evidence.
- The R888 handoff commit advances the PR head and may trigger new failed Actions automatically. **Read the CURRENT HEAD and CURRENT runs** before further conclusions. No manual CI dispatch was performed here.

## 5. REMAINING P0 RELEASE GATES / CONFLICTS

1. **Final Firebase packaging / Functions deployment identity.** R887 verifies local compiled files after the TypeScript predeploy hook but does not prove which archive Firebase CLI packages/submits, or the exact deployed Cloud Functions v2/Cloud Run revision and image digest. Verify Firebase CLI version 15.22.3 semantics, `PROJECT_DIR`, `RESOURCE_DIR`, `GCLOUD_PROJECT` hook environment, authoritative package manifest, and provider revision evidence. Preserve the existing export-namespace/privacy checks.
2. **Provider site/domain authority.** Independently confirm `urai.app` custom-domain mapping to the actual Firebase Hosting site and that the selected live-channel release is current. Use paginated data; do not mistake preview-channel history for production.
3. **Read-only security identity.** The current WIF account in the workflow is a deployer, not an independently proven least-privilege read-only account. The collector sends only GETs but this alone is not credential-scope authorization. Do not consume credentials or call production APIs without owner permission.
4. **Rollback parity and recovery.** Hosted version restored via live-channel release does not prove the deployed backend revision/Functions configuration, storage, rules, or private security contracts match the rollback SHA. Rebuild/redeploy of historical source is not guaranteed bit-identical to prior running revisions.
5. **GitHub native exact-source CI.** Fix/diagnose failed latest runs using actual job step/log data. 2FA access may be unavailable; connector read-only analysis works. No paid runner/scheduled process without approval.
6. **Protected cross-repository integration.** Actually exercise consent issuance/verification and owner isolation, source provenance, revocation and deletion races, private memory -> Jobs -> Studio -> Replay -> deletion, including refusal of forged/stale consent. Preserve Jobs/Privacy/Studio worker PRs and independently pin hashes; source-only fixtures are not authenticated cross-service acceptance.
7. **Actual Home -> Ascent -> Life Map -> Focus -> Replay -> Escape -> Focus -> Life Map -> Home**, first-person continuity, orb, Focus star-to-star, accessibility incl. reduced motion, blind/haptic and PTSD/TBI accommodation, browsers/physical devices/XR. Existing code and past tests exist; latest physical device/runtime release acceptance remains unproven here. Independent Focus worker PR #2072 must not be overwritten.
8. **Owner release authorization and provider readiness**, including GCP project billing/identity, WIF approvals, production safety, and legal consent. No permanent removal of HOLD before audited evidence and explicit owner approval.

## 6. EXACT SAFE NEXT-CHALK EXECUTION SEQUENCE

1. Use connected GitHub; read the Labs estate registry PR #262 start/protocol/inbox and FULL R885/R886/R887/R888 estate handoff files on Spatial PR #2073. Verify fresh GitHub PR HEADs/branches for #2073, #1636, #2072 and any overlapping Jobs/Privacy/Studio controller work. Do not blindly reuse the prehandoff SHA.
2. Source-read `firebase.json`, `apps/functions/tsconfig.json`, `scripts/check-spatial-export-deployment-boundary.mjs`, `scripts/R883_VERIFY_FUNCTIONS_BUILD.mjs`, `scripts/r887-guard-functions-predeploy.mjs`, its 9-case tests, and the exact workflow/yaml. Compare content Git blobs with the ledger and identify any drift or contradictions.
3. On a local exact-head source checkout with Node 22 and Git (and pnpm 10 for full app tasks), first run offline Node tests above. Inspect generated `firebase.r887.governed.json` and verify hooks execute in real Firebase CLI context without a cloud deployment. For safety test a harmless local/fixture project, not live production. Confirm final provider-package bytes if tooling permits; otherwise mark `unverified` and keep HOLD.
4. Investigate current GitHub Actions failures using connected jobs/steps/logs. Prior logs were unavailable; if still so, record exact API failure and investigate authorized free offline/native runner alternatives without assuming a cause or spending.
5. Design a distinct **read-only** authenticated Firebase/Cloud Functions/Cloud Run provider revision/digest collector with explicit permission and no secret logging. Do not call production on an unapproved deployer token. Review site/domain mapping and rollback-only history.
6. Reconcile cross-service positive owner consent and private asset lifecycle with other workers using source-pinned emulator + real authenticated runtime evidence; restore actual full integrated device flow when authorized.
7. Any code changes belong on an isolated review branch with a draft PR, or coordinated updates to PR #2073 if no other worker has altered it. Record exact source diffs, test output, byte/hash coverage, failures, blockers and the next handoff. **Never merge main or deploy without explicit owner approval.**

## 7. CONTINUITY AND PRODUCT CANON

UrAi is the consumer experience; RuAi is the professional/B2B hub. LifeLogger, LifeOS, and UrAi were built starting in 2024 and are being unified, not invented from scratch. Product travel: Home -> Ascent -> Life Map -> Focus -> Replay -> Escape -> Focus -> Life Map -> Home; Orb, Council, Mirror, Emotional Weather, Passport, Shadow, Possible Futures, Studio/Jobs/Privacy provenance, user ownership, accessibility, and protected private media. The human-AI co-creation history is part of the project canon. Preserve 2024-present architecture and existing actual implementations while distinguishing working code from launch certification.

## 8. WHAT IS NOT DONE, AND WHAT WAS NOT DONE IN R888

R888 is a **handoff packaging step**, not a new code fix. It reads available authoritative GitHub source/registry and CI metadata and saves the current state. It neither reran R887 tests nor rebuilt the full Spatial system. It did not access private user media, use provider credentials, fix GitHub 2FA, run real multi-service emulator with owner identity, do physical-device testing, change cloud resources, incur paid compute, deploy, merge, or authorize production. The next worker must validate all assertions and may need to reconcile newer overlapping worker changes.

**Current disposition: R888 HANDOFF SAVED; PR #2073 remains draft/unmerged; PRODUCTION HOLD.**
