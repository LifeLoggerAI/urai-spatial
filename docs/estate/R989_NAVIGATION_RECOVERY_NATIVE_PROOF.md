# R989 — navigation recovery and native passive-consent proof

Production HOLD. Continuation of Spatial #2078; no main merge or deployment.

## Implemented
Recovered the exact browserLocationStore.ts and its six behavioral tests from Focus #2072 donor 3919023539674e152caf7c7c2a568947980568d3. Connected the observer to the R988 useSelectedMemory hook using useSyncExternalStore. Same-route pushState/replaceState now changes selection identity, detaches the old owner subscription, and rejects late old-source callbacks. Existing owner checks, manifest validation and R987 bucket handling remain. This is a prerequisite for Focus navigation, not a claim that private next/previous traversal is integrated.

Two new actual-hook tests failed before the repair and passed afterward. Both original unit runners now enroll the browser store, selected-memory lifecycle, bucket fail-closed, Replay behavior and Life Movie privacy suites. Updated stale launch source assertions to require explicit bucket authority, the governed/private Life Movie source modes and the current consent-gated multi-provider Council dispatcher. Added the launch contract to the compact runner and protected registration in the coverage test.

The dedicated real-Firestore proof completed all handler assertions but its receipt writer initially failed because it assumed Functions-local node_modules. Corrected the workflow's package version resolution to follow actual installed entries under either hoisted or isolated layouts without bypassing package exports. Re-executed the workflow-generated wrapper with the real emulator successfully.

## Observed verification
Node 22.23.4; pnpm 10.0.0; Java 21.0.13; frozen lockfile. Tier1 TypeScript, Functions TypeScript build and optimized Next 15.5.7 build PASS. Focused runner: 271/271 PASS. Initial broader runs exposed stale source-contract assertions, which were corrected against actual current source. Compact runner final result is retained in the private execution packet; do not infer assertion counts from suite counts.

Focused five-suite execution: 46/46 PASS (overlaps the focused runner; do not add twice). Passive-location actual-TypeScript/model suite: 38/38 PASS. Dedicated real Firestore proof: original 8 positive cases PASS plus all 6 expected regression violations reproduced; repaired 14/14 PASS. Its synthetic callable context does not verify JWT/App Check, client Rules, C6 authorization or production IAM. The ordinary Functions test command remains failing because it discovers this guarded emulator-only test without the required emulator environment; the dedicated workflow, not that unconfigured command, produced the successful emulator result.

## Evidence and limitations
R988 tree byte audit: all 6,309 distinct Git blobs verified by Git SHA-1 and SHA-256 across 8,939 tracked paths, 379,287,837 declared bytes. No LFS pointers found. Scope is this one tree, not every branch/history or external asset. Complete byte ledger and raw failures/successes are in the private execution packet, not copied into this public repository.

Current-head R988 hosted Spatial CI run 42757510362 had seven failed jobs, runner_id=0 and steps=[]. No executed hosted acceptance or root cause is claimed. Review, full private Focus provenance/consent model convergence, receipt-backed private playback, signed C6 issuer, Studio-to-Jobs consent transport, Jobs #252 physical Storage fence, authenticated full lifecycle, real devices, visuals, benchmarks and release approval remain open.

## Resume
Read R989_SOURCE_PINS.json, verify every source blob against the candidate, then repeat both original Tier1 runners, typecheck/build and the dedicated passive-firestore-transaction-proof.yml workflow under its guarded demo environment. Preserve the actual original failures and repaired cases. Fix ordinary Functions test/emulator orchestration without skipping a required gate. Reconcile the remaining Focus donor authorization models before enabling private next/previous controls. No provider output generation, real-user media, IAM/Rules changes or production release occurred.
