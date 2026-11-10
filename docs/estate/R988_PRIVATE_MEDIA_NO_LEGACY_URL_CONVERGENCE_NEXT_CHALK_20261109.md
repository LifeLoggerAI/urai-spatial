# ONE URAI GENESIS — R988 PRIVATE-MEDIA FAIL-CLOSED CONVERGENCE AND NEXT CHALK HANDOFF
**Date:** 2026-11-09 America/Chicago. **Production:** HOLD / NO-GO.

## Authority and exact source
Parent is R987 PR #2077 exact commit `f05b62fe774fe2aab5173a5a6136c638a7f0b156`. R987 already contains Spatial #2074 transactional passive consent plus #2076 missing-private-bucket fail-closed fixes. R988 is a **child review branch** and changes four additional source/test paths, without changing R987, main, or production.

| Path | Git blob after R988 |
|---|---|
| `urai-tier1/src/app/replay/replayVisualAdmission.ts` | `a639b726b21e3ae86bb9ea8407b80154e7dc347a` |
| `urai-tier1/src/app/focus/FocusChamberClient.tsx` | `622e0f129e4a14d251ad88c5417107b187acb101` |
| `urai-tier1/src/app/life-movie/LifeMovieClient.tsx` | `617eb6e5f5ef3598dd8451312fce63ab94c3837e` |
| `urai-tier1/tests/replay-source-media-behavior.test.mjs` | `bde00f62e259b73b6a4bb907855a81fe550b7bed` |

## Actual new implementation
- Replay `replayVisualAdmission` now returns neutral for any non-demo canonical memory even when sourceMedia contains valid-looking https/blob/data URLs. Owner metadata visibility is not media playback authorization.
- Focus's `MemoryImprint` path now only admits media from an explicitly flagged demo memory, otherwise no legacy sourceMedia image.
- Life Movie's `mediaFor` refuses all non-demo canonical media in the legacy player until a separate receipt-backed playback path is connected.
- Existing Replay behavior test now expects private neutral and demo recorded media. Two additional tests assert 24 private URL-variant/property combinations deny and assert the three callsites retain their guards.

## Tests and limitations
- **Local isolated** Node 22.16.0 --experimental-strip-types reproduction of the pure admission helper: **4/4 PASS**. It was a local recreation, not a test of the exact GitHub source checkout or the entire application.
- Exact GitHub updated file content was read back after all four code modifications and the additional test update. GitHub source identity PASS.
- The new integrated 2 tests have source readback only; **NOT RUN** at the original repository root. No full TypeScript, Next build, emulator, browser, device, XR, p95 benchmark, or authenticated private playback run.
- Direct container GitHub clone failed DNS: `Could not resolve host: github.com`. Do not call local isolated checks current-head test certification.
- This patch is deliberately fail-closed but **temporarily suppresses personal photosphere, direct Replay, and Life Movie media** until the real owner- and consent-scoped playback hook is integrated. Product and accessibility review needed before merge; the user should not be told that fully working private playback is implemented.

## Additional source incompatibility with Spatial #2072
- Spatial #2072's `focusStarTravel.ts` assumes `LifeMapNode.memoryId`, `LifeMapNode.replayManifestId`, `LifeMapNode.authorizedMemory`, and `SelectedMemory.sourceMediaReceipts`. At the current R987/R988 main lineage `LifeMapNode` lacks those canonical authorization fields, and `SelectedMemory` has no sourceMediaReceipts.
- Spatial #2072 descends from a wide 1,609-commit donor lineage (compared with pinned main). Blind cherry-picking its Focus client or root runtime files would replace substantial later-but-different code.
- `useSelectedMemory` currently listens to `popstate` rather than automatically observing Next router `replace` transitions. Any star-to-star navigation must prove selected-memory hook updates and owner+consent revision per selection.
- Further specific overlap: Life Movie source and Life Movie privacy regression are modified in both R987 and #2072. Use three-way semantic reconciliation; preserve R987's explicit bucket `?? null` fail-closed.
- Until current LifeMap node provenance can bind an owner/current consent epoch+canonical memoryId+manifestId, keep next/previous traversal off rather than turning client route parameters into authority.

## Remaining cross-repository P0 release gates
1. Privacy #259 real `life-movie.render` decision issuer (version 1.1.0) bound to owner, tenant, plan digest, source set, epoch, expiry and signed verifier.
2. Studio #202 typed `create` action + route must carry top-level `consent`; Jobs #394 actual strict Zod requires it and rejects the current Studio shape.
3. Jobs #252 exclusive storage future-write fence and generation-bound purge acknowledgment, including alternate writer 403, pre-byte reservation, resumable upload drain.
4. Protected Actions runner startup-failure / no-step CI repair and independent reviews. Run four Firebase emulators plus exact source frozen tests.
5. Current live Firebase Rules/IAM/Storage/hosting/deployment identity, authenticated C6 render→private Replay→revocation/deletion, 9-state device/browser/a11y/AAA+++ acceptance, 40 benchmark gates, XR real hardware and rollout certification.
6. Supporting system proofs: RuAi tenants, Analytics deletion/retraction, Storytime physical generation-safe deletion, Content publication rights, Communications delivery/suppression, Marketing tracking restraint, Asset Factory raw/rights/provider and Foundation legal authority.
No GCP/Rules/IAM mutation, no paid media generation, no private customer media, no source main merge and no production deployment occurred.

## Next worker concrete test commands (run only after exact checkout)
- `node --experimental-strip-types --test urai-tier1/tests/replay-source-media-behavior.test.mjs` from correct `urai-tier1` working directory, with project-supported runtime and dependencies.
- `node --test urai-tier1/tests/private-media-bucket-failclosed.test.mjs urai-tier1/tests/life-movie-privacy-contract.test.mjs` with correct package working directory and existing runner.
- Full source-controlled `pnpm` frozen build / Tier1 typecheck, Firebase Auth/Firestore/Functions/Storage protected emulators, browser state matrix, owner-revocation tests; capture exact SHA and raw logs.
- Do not assert UI/Replay acceptance until genuine receipt-backed private media can be decoded and revoked on the exact integrated source.

**State: R988 REVIEW SOURCE CONVERGED; APP RUNTIME NOT CERTIFIED; PRODUCTION HOLD.**
