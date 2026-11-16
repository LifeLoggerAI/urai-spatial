# ONE URAI GENESIS — R983 Spatial private-media authority review and next-Chalk handoff
Date: 2026-11-09 Central. Status: PRODUCTION HOLD / NO-GO. Scope: source-pinned review-only private Replay/Life Movie URL configuration boundary. No protected deploy, IAM, Rules, billing or production media mutation.

## Estate continuity
Preserve the existing LifeLogger → LifeOS → GetUrAi → UrAi consumer → RuAi professional work, historical branches and exact evidence. Spatial owns the consumer journey Home → Ascent → Life Map → Focus → Replay → Escape → Focus → Life Map → Home. Genesis master review #262 and R980–R982 review #342 are separate, unmerged continuity records.

## Source-confirmed gap
Spatial main at start: da94837c2457b0a7590e26a7a644cd728de8afb8.
- selectedMemoryContract.ts original blob a56ea549c5be5a8f5a85b6444dba75b145386e8a: trustedMemoryMediaUrl(value, storageBucket?) returns a nonempty raw URL if bucket is undefined, for offline fixture use. For null/empty bucket, it rejects URLs; for configured buckets, HTTPS and expected Storage bucket/host are required.
- Firebase public readiness in client.ts blob ecd18f3da0ad52ec39e287329bf747650ec8ef48 does not require NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET because the public demo shell must still render.
- Real owner Firestore subscription in useSelectedMemory and both Life Movie paths passed the possibly undefined bucket directly. Missing runtime configuration therefore selected the fixture bypass. This is a source-confirmed media URL validation gap, not proof of customer data access, Storage IAM bypass or deployment.
- Accepted source URLs flow to ReplayRecordedSource.tsx blob c5fb7e6f9826ba3e99fb59e7c933603ac8ab2ee2 and replayMediaSession.ts blob 487e2bac58b5e61b37a3a29f85754ee6cb3ab00d.

## Exact review-only R983 change
Branch: review/chalk-r983-spatial-private-media-bucket-failclosed-20261109, created from the main SHA above.
1. useSelectedMemory.ts: pass process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null; old blob 935e08102d187398dcc041fbb785e29a1bf6f28b, updated blob fbcc945280e5455451114d72f77f0f7835d3f3b4.
2. LifeMovieClient.tsx: identical guard on selected-chapter and owner-memory-list reads; old blob dc9c32c9e5e0881847d0bf77376839a9b4d603cf, new blob 421fcffa74ce21f2265ce6a4c82cdfab89219c85.
3. life-movie-privacy-contract.test.mjs: strengthened exact guards for all three callsites; blob c3efffa0df6ec6c54a43422e0f0c139ea5a7c2fc.
4. New private-media-bucket-failclosed.test.mjs: null/blank and wrong bucket refusal, HTTPS configured bucket acceptance, output stripping, and source integration counts; blob 6ebbd99bbf910231774f9d87289fd0b20bc86e04.

## Verification tiers and limits
- CONNECTOR-SOURCE VERIFIED: all four updated/new blobs read back on exact review branch. One guarded Replay source call, two Life Movie calls, source assertions present. This is a static source-shape check, not native acceptance.
- NOT RUN: Node tests, TypeScript, Next build, browser, native Firebase emulators, protected CI, signed owner/private Replay, Cloud Storage IAM, post-revocation physical 403 or purge.
- Local direct git ls-remote failed DNS Could not resolve host: github.com (Node 22.16.0, Git 2.47.3). Do not reclassify this as a test pass.
- This guard is limited: even a correctly configured bucket check is not an access grant, revocable link, authenticated per-request proxy, writer IAM fence or deletion certificate. Continue fail-closed until backend end-to-end proof.

## Next exact acceptance
On an approved clean runner checkout exact R983 SHA, verify git status and blob hashes, then within urai-tier1 run:
  node --import tsx --test tests/private-media-bucket-failclosed.test.mjs tests/life-movie-privacy-contract.test.mjs tests/selected-memory-live-lifecycle.test.mjs
Then run repo-pinned aggregate tests, typecheck, Next build, missing-bucket browser negatives, explicit-demo continuity and authenticated owner private Replay tests. Keep raw logs, exit codes, log hashes, commit/tree/runner identity. Never weaken the explicit missing-bucket denial to make tests green.

## Cross-service critical path
Privacy #259 remains denial-only, no positive scoped Life Movie grant; Studio #202 dispatch/providergeneration/public release hard-off; Jobs #392 strict outer consent transport rejects current Studio producer, authority hard-off; Jobs #252 P0 future-write fence and active upload drain open. Jobs #380 owner Rules and Privacy #83 revocation enforcement open. Spatial #2072 Focus and #2073 release controller remain separate review candidates; preserve them. Storage/IAM, owner authenticated replay, revocation/deletion/purge ACK, staging/rollback, protected CI, independent approvals and device/a11y/AAA+++ visual founder signoff remain unverified.

Do not merge these review changes wholesale or enable private rendering. PRODUCTION HOLD / NO-GO.
