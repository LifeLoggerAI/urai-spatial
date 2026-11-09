# ONE URAI GENESIS — R977 Passive Consent Runtime Continuation

**Observed:** 2026-11-09 (America/Chicago)  
**Disposition:** REVIEW ONLY / PRODUCTION HOLD / NO-GO  
**Parent work:** Spatial #2074 (R976 passive signal source recovery), Genesis #343 (R976 system handoff).  
**New blocker:** Spatial issue #2075.

## 1. Exact source pins re-read

- Spatial main baseline at #2074 creation: `da94837c2457b0a7590e26a7a644cd728de8afb8`.
- Recovered candidate branch: `review/genesis-r976-passive-transaction-recovery-20261109`.
- Passive transaction handler in candidate: `apps/functions/src/passiveSignals.ts`, blob `d8ae58911f25e1c06669f507d94cc4c9c4acacc9`.
- Location-consent test: `apps/functions/test/passive-signals-location-consent.test.js`, blob `1567d585d124664c6202fea7eb7de4c3f11b8bee`.
- Real-Firestore emulator proof: `apps/functions/test/passive-signals-firestore-transaction.test.js`, blob `cbcd9d598352ee4398caf7c375530fccd232c8d0`.
- Original pre-transaction fixture: blob `167eefc30f285c549051379d45e49853e847ec0e`.
- Location-consent workflow: blob `d7ab88fcc450435c7c8aef549908f202693caa73`.
- Firestore transaction workflow: blob `1d720419c953643b63a4374d99e21daf36913a13`.
- Six recovered source/test/workflow blobs were previously verified as exact matches, 6/6, in R976. No new local/native execution is claimed here.

## 2. What the server handler does

The recovered handler now allocates one target signal reference, reads `users/{uid}/privacyPolicy/current` inside Firestore `runTransaction`, validates workforce automation plus type-specific location/models/identity consent, normalizes payload, and writes the signal in the same transaction. A conflicting policy revision forces a retry; on retry a revoked or missing policy denies the write. For location, only server-stored `location.precise === true` permits unrounded coordinates. Client-supplied precision labels and extra consent fields do not grant precision. Voice/image raw media remains excluded.

This is a correct source-level repair to the stale-consent write race, subject to exact-head build and runtime proof.

## 3. Separate newly discovered client projection ordering issue

Spatial main `apps/functions/src/privacyOperations.ts` blob `f1f341a56d616c64cbac97aa306cdec3c4687903`:

- `applyConsentPolicy` commits authoritative `users/{uid}/privacyPolicy/current` and `privacyEnforcementJobs/{jobId}` in a Firestore transaction. The new policy revision is stored with enforcement state `pending`.
- Later, the `processPrivacyEnforcementJob` onCreate trigger writes the derived `users/{uid}/privacyRuntime/{target}` projections in a separate batch. Targets include `workforce-actions` and `location-collection`.
- This is asynchronous relative to the canonical policy transaction. The code does not make those projection writes atomic with the initial consent change.

Spatial main browser `urai-tier1/src/spatial/signals/PassiveSignalRuntime.tsx` blob `05e4bc7e964303a710c2e8a782d0c8e8133672ad`:

- Subscribes to `privacyRuntime/workforce-actions` and `privacyRuntime/location-collection`.
- Uses those projection documents to set runtime authority, retain passive event listeners and decide whether to request browser geolocation.
- A stale projection can therefore keep browser collection attempts active until the asynchronous enforcement write arrives.

**Boundary:** #2074's transaction prevents a passive signal from being committed with stale consent if a restrictive policy transaction wins before signal transaction commit. It does not atomically update client projections or cancel a geolocation request already issued by the browser. This is a source-level ordering gap, not evidence of a deployed exploit or a signal actually stored after revocation.

Tracked in [Spatial issue #2075](https://github.com/LifeLoggerAI/urai-spatial/issues/2075).

## 4. R977 review-only acceptance design for #2075

A safe implementation must preserve asymmetric policy behavior:

- **Restrictive changes (denied/paused, automation off, location collection off, precision downgrade):** make the effective client gate restrictive at the same canonical commit boundary, or require a current authoritative revision check that fails closed before enabling listeners/sensor requests.
- **Grant or relaxation:** do not enable collection merely because canonical policy was written. Keep it disabled until existing enforcement succeeds and a current revision-bound projection is verified.
- **Out-of-order enforcement:** an older delayed job must not overwrite a newer policy projection; all writes must compare the target revision/owner/job against the current authoritative revision.
- **In-flight browser APIs:** tear down event listeners on restrictive change, invalidate callbacks from older authority revisions, ignore late geolocation callbacks, and preserve server transaction denial as the final admission gate.
- **Projection errors/missing docs:** remain fail-closed, no default grant, no permissive cached state after reconnect/re-auth.

Required disposable-emulator tests:
1. Restrictive policy commit occurs while projection is still stale; browser gate becomes restrictive before trigger runs.
2. A grant remains disabled while enforcement is pending or fails.
3. An older enforcement job arrives after a newer revision and cannot overwrite it.
4. Workforce automation revoked during an active browser session; activity/motion callbacks stop.
5. Location permission callback arrives after revocation; callback is discarded.
6. Precision downgrade and collection denial races; stale precise coordinates never persist after the new policy commit.
7. #2074 actual transaction handler and projection transition are tested together with real Firestore transaction ordering.
8. Authenticated callable/App Check and Firestore Rules are distinct tests, not inferred from synthetic callable context or Admin SDK bypass.

Do not implement a permissive client-side mirror, rely only on eventual trigger latency, or infer consent from an old runtime projection. No live data, production credentials, paid providers, IAM/Rules mutation or deployment.

## 5. Exact-head Actions refresh for Spatial #2074

Exact candidate head refreshed: `11135abb7cd9ed3f3abfa16eed2c3795c3186840`.

- Passive Signal Consent Persistence Proof: run `42663583456`, job `129321227974`, conclusion failure, step field null. Job-log download returned GitHub BlobNotFound.
- Passive Consent Real Firestore Transaction Proof: run `42663583376`, job `129321227713`, conclusion failure, step field null. Job-log download returned GitHub BlobNotFound.

No test assertion output is available. Treat both as failed workflow conclusions with no inspectable execution steps/logs. Do not call this source test failure and do not call it passing acceptance. Rerun on a working, protected exact-head runner and retain immutable logs/artifacts.

## 6. Fresh Privacy #259 execution refinement

Privacy #259 head: `c3c760df775052d16a933f05b6c6f4a9a1a332b8`, parent #258. It repairs a dirty-checkout evidence capture and nonexistent harness filename.

Reported on that review head:
- Privacy root + Functions dependency installs PASS.
- Functions typecheck/build PASS.
- Pinned Jobs install plus shared-types/Functions builds PASS.
- Full wrapper stopped at Eventarc registration HTTP 404 before running harness.
- Targeted Eventarc probe without inherited proxies returned HTTP 200.
- With proxy variables removed, actual Auth/Firestore/Functions/Storage emulator startup proceeded and original Jobs import + real Auth-emulator owner creation were verified.
- Functions listener failed with Unix socket `EPERM`; callable expected failed-precondition but received deadline-exceeded. Native callable acceptance remains BLOCKED.

These are PR-reported receipts and limitations; no positive consent, render or release PASS.

## 7. Runpod cost observation (read-only)

Pod `bvandlyauxhevl`, name `one-urai-r950-r384-exact-late-write`:
- Status RUNNING; CPU flavor `cpu3g`, 2 vCPU / 8 GB; reported rate USD 0.08/hour.
- Container command is `bash -lc "sleep infinity"`.
- Runtime CPU utilization 0 and memory utilization 0 at readback; no mounted volumes listed.
- Started 2026-11-09T13:45:37.893Z; last observed on 2026-11-09 at approximately 18:02 UTC.
- Container log has startup/restart history, no evidence in the retrieved window of a test command.

No stop/restart/delete action was taken because the SSH pod may belong to another concurrent Chalk worker. Owner should determine whether it is still needed; if not, stop it to cease compute billing. Container disk is ephemeral and stopping wipes it; confirm no needed state before stopping.

## 8. Next execution order

1. Re-read current main and review heads; refresh all PR bases and tree SHAs.
2. Restore usable runner admission/log collection for Spatial #2074. Run Node 22 locked Functions install/build, compiled handler behavior suite, then the guarded disposable Firestore emulator original-vs-repaired commit-ordering proof.
3. Keep the new #2075 client-projection issue separate; prepare a minimal source candidate only after exact inspection of all consent enforcement job callers, then prove monotonic revisions and in-flight API cancellation.
4. Reconcile Spatial's legacy passive signal collection schema with Analytics #89 owner-key/idempotency migration and UrAiProd `passiveSignals`; no silent backfill or collection graft.
5. Keep Privacy R27 denial-only, Jobs #252 storage write hard-off, and the authenticated consent → SceneTruth → Studio → Jobs → private Replay → revoke → purge ACK release path unapproved until independently proven.
6. Preserve exact command, environment, source and artifact hashes, raw logs, reviewer identity and honest blocked/failed classifications.

**Final status: PRODUCTION HOLD / NO-GO. No merge, deploy, grant, private data, paid generation or live provider mutation.**
