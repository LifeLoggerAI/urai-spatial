# ONE URAI GENESIS — R976 Passive Signal Consent Donor Recovery and Integration Review

**Date:** 2026-11-09 (America/Chicago). **State:** REVIEW-ONLY / PRODUCTION HOLD / NO-GO.

## Purpose

Recover a known, previously merged privacy fix from the historical Spatial release-closure lineage without overwriting canonical main or assuming earlier test evidence transfers to this new branch.

## Exact lineage

- Main baseline observed at creation: `da94837c2457b0a7590e26a7a644cd728de8afb8`.
- Original transaction repair: [Spatial #1712](https://github.com/LifeLoggerAI/urai-spatial/pull/1712), head `1b535a033073f2e9ba2accea34bd7dd18abacd10`, merge commit `c2c921e002aace5efad841c388f233cfcac18a9b`.
- Real-Firestore proof donor: [Spatial #1719](https://github.com/LifeLoggerAI/urai-spatial/pull/1719), head `51f4a5acb55b5e7ec513efdd6542690d1065a47e`, merge commit `197839c1767333b9efc6ad2604136d76aeacdc69`.
- On main, `apps/functions/src/passiveSignals.ts` at blob `79fdc89c7e97e9790b0b34df37ef188c1c65de76` separately reads `users/{uid}/privacyPolicy/current` and calls `ref.set` afterward; for denied precise location it rounds only when the *client-supplied* `payload.precision` is `precise`. A malicious or mistaken client can label precise coordinates `approximate` while retaining unrounded coordinates.
- On the donor, the policy read and persistence occur within one `db.runTransaction`; policy conflicts retry consent and minimization. Every non-precise policy path rounds coordinates regardless of client precision label. Handler donor blob: `d8ae58911f25e1c06669f507d94cc4c9c4acacc9`.

## Exact recovered blobs (all read back on this review branch)

| Path | Git blob SHA |
|---|---|
| `apps/functions/src/passiveSignals.ts` | `d8ae58911f25e1c06669f507d94cc4c9c4acacc9` |
| `apps/functions/test/passive-signals-location-consent.test.js` | `1567d585d124664c6202fea7eb7de4c3f11b8bee` |
| `apps/functions/test/passive-signals-firestore-transaction.test.js` | `cbcd9d598352ee4398caf7c375530fccd232c8d0` |
| `apps/functions/test/fixtures/passiveSignals-before-consent-transaction.ts` | `167eefc30f285c549051379d45e49853e847ec0e` |
| `.github/workflows/passive-location-consent-proof.yml` | `d7ab88fcc450435c7c8aef549908f202693caa73` |
| `.github/workflows/passive-firestore-transaction-proof.yml` | `1d720419c953643b63a4374d99e21daf36913a13` |

This is a *source transplant*, not a conceptual reimplementation. Existing signal types, owner-scoped collection destinations (`behaviorSignals`, `voiceEvents`, `locations`) and raw-media hard-off are preserved. The current mounted web producer is `urai-tier1/src/spatial/signals/PassiveSignalRuntime.tsx`, loaded by `urai-tier1/src/app/layout.tsx`. Do not claim device sensor activity is active without explicit runtime/environment/user consent evidence.

## New verification in this R976 execution

1. Independently read main and donor full handler bytes via GitHub.
2. Computed line-level comparison: consent transaction and coordinate-minimization blocks are the substantive changes; no additional signal families were introduced.
3. Created branch from **exact** main SHA rather than changing main.
4. Wrote donor handler and five original proof artifacts to the review branch.
5. Re-read all six files at the new branch and verified each Git blob against the above source pins: **6/6 MATCH**.

**NOT EXECUTED in this round:** Node unit suite, strict TypeScript build, real Firestore emulator, GitHub Actions successful runner, authenticated callable/JWT/App Check, IAM/Rules, deployed Firebase review, production read/write/revocation or owner-data handling. Historic #1712 reports 38/38 model-based behavior checks; historic #1719 created an actual Firestore proof harness, but those are NOT passing R976 receipts.

## Important invariants and remaining questions

- Verify transaction retries and policy update conflict ordering with the **original** real Firestore emulator suite, locked SDK and Node 22. Pre-repair fixture must reproduce stale-consent failures; donor must deny after revocation/downgrade. Capture both timestamp ordering and explicit output hashes.
- Confirm all generated recording docs respect current Firestore schema/retention/data-rights contracts and Privacy consent domain policy. Confirm user/tenant binding through authenticated callable, not synthetic `context.auth` only.
- Verify coordinates, accuracy and precision under *all* policies, including when client supplies `approximate` with high-precision values. Never use passive events as objective diagnoses/psychological truth.
- Browser source currently subscribes to `privacyRuntime/workforce-actions` and `privacyRuntime/location-collection`; server authorizes `privacyPolicy/current`. Reconcile client policy readiness and server policy source instead of broadening access.
- Spatial `users/{uid}/behaviorSignals` / `voiceEvents` / `locations` differs from legacy `UrAiProd` `users/{uid}/passiveSignals`, while Analytics ingests derived events with different envelope, idempotency, HMAC producer scope, owner-key and data-rights rules. No silent schema graft or backfill. Analytics [#89](https://github.com/LifeLoggerAI/urai-analytics/pull/89) is review-only and warns of duplicated logical signals under its new owner-hashed IDs.
- Exact active deployed callable/functions/Hosting fingerprints **unknown**; do not claim production contains either implementation or authorize release from source-only evidence.
- GitHub Actions failures elsewhere show zero-step startup or missing logs. A queued/failed workflow cannot be called PASS.
- Preserve original #1712/#1719 historical work even if the new candidate is rejected; never delete working history.

## Successor Chalk execution sequence

1. Refresh main, R976 branch, #1712/#1719 merge ancestry and PR states. If current main advanced, rebase to exact new SHA in a **new** controlled branch, without force-pushing shared work.
2. Run original source-mode and compiled-handler test, then demo-only Firestore emulator proof with exact locked dependencies. Do not use live project credentials; record every failure and verified artifact SHA.
3. Inspect Privacy consent source, Spatial `privacyRuntime` projection, Analytics passive-signal identity/data-rights, and old `UrAiProd` derivation readers; design explicit producer→consumer map with transform, consent, source classification and deletion.
4. Test malicious label and race cases, authenticated owner/tenant access and revocation/downgrade. Document actual *deployed* rules and callable only with authorized read-only proof.
5. Obtain independent exact-head review and protected CI; only then consider controlled integration into canonical Spatial. **PRODUCTION HOLD / NO-GO remains.**

## Estate root and broader production blockers

- Central Genesis master [Labs #262](https://github.com/LifeLoggerAI/urai-labs-llc/pull/262) and [master execution #340](https://github.com/LifeLoggerAI/urai-labs-llc/pull/340).
- Studio #202 is an **unmerged** primitive SceneTruth string-type fix; Jobs #384/#389/#391 and Privacy recent verifier/runner work remain branches, not certified positive cross-service flow.
- Life Movie: authenticated consent → privacy proof → immutable SceneTruth → strict Studio envelope → Jobs write fence → private render → Spatial Replay → revoke/delete/ack still lacks passing production-equivalent end-to-end evidence.
- AAA+++ Home/Life Map/Focus/Replay/Captured Reality, real device/accessibility, release rollback, rules publish ownership, exact SHA protected CI/reviewer, authorized user-data continuity and production verification remain open.

## R976 exact-head GitHub Actions readback (after opening draft #2074)

Commit `454cb598dd30c685a1f3e060a5fb5072092a2a4f` triggered Actions. **Actual Firestore proof** [run 42662704962](https://github.com/LifeLoggerAI/urai-spatial/actions/runs/42662704962) ended `failure` on 2026-11-09. Its check `actual-firestore-commit-ordering` (job `129318138572`) has **zero returned steps**. The parent [Spatial CI run 42662705285](https://github.com/LifeLoggerAI/urai-spatial/actions/runs/42662705285) also returned failure, with `Functions build and tests` job `129318139391` and `Workspace install and preflight` job `129318139263` reporting **zero steps**. [Production Verify run 42662705325](https://github.com/LifeLoggerAI/urai-spatial/actions/runs/42662705325) also failed without evidence of actual test-stage execution.

Classification: **CI CHECKS FAILED / NO EXECUTED TEST EVIDENCE AVAILABLE**. This matches the larger GitHub Actions pre-runner allocation/zero-step pattern, but the cause is not independently diagnosed. This is neither new source-level red regression nor proof of PASS. Restore reliable runner/permissions/review path; rerun exact-head locked native and demo-only Firebase proof and retain raw logs before any approval. Main remains unchanged; production HOLD.
