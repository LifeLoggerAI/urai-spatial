# UrAi Genesis — Living World Scenario Basis Authority — nonrelease checkpoint

Date: 2026-11-03. Scope: one isolated, source-bound proof repair on the existing Spatial release-controller parent; **not** a launch receipt.

## Original baseline
- Repository: LifeLoggerAI/urai-spatial
- Exact parent commit before this child: `a86e6743f94ada06be5c25afcd8d91357ec405ce` (Spatial #1636 controller branch).
- Existing authorities preserved: `apps/functions/src/scenarioOperations.ts`, `urai-tier1/src/lib/scenario/scenarioClient.ts`, `urai-tier1/src/app/possible-futures/PossibleFuturesClient.tsx`, `apps/functions/test/provider-scenario-canonical-consent.test.js`.
- Existing scenario branch-selection fix and Council account/consent isolation already existed on controller branch; neither was rebuilt.

## Actual defect
`createPossibleFuture` persisted `worldRevision: String(data?.worldRevision ?? 'unknown')`. The client supplied `client-context-v1` without a server-verified canonical world revision. This was a client-controlled authority label, not a verified Life Causal Graph snapshot or production evidence of world synchronization.

## Exact repair
- Server no longer trusts a client-supplied `worldRevision`; it persists `worldRevision: 'unverified'` and `worldRevisionVerified: false`.
- Server computes a SHA-256 `evidenceScopeDigest` from the server-authorized evidence references resolved within the existing scenario transaction. The digest identifies the admitted *reference scope only*: it is **not** a content-fixity hash, complete world state, or a replacement for a canonical graph revision.
- Client stops sending the unverified placeholder value; client type stops advertising it.
- Three new synthetic tests cover forged client labels, changes to allowed evidence scope, and explicit assumption-only mode. These tests are source changes pending a real Node 22 / compiled Functions run.

## Status and acceptance boundary
- Source updated on isolated development branch only. No production merge, external provider, Firestore production read/write, live scene, real-user media or paid compute.
- GitHub connector writes are authoritative for the source edits. **No local original-repo build, CI pass, end-to-end scene, benchmark, or visual certification claimed.** Container cannot currently resolve github.com to perform an authenticated clone; current exact-head GitHub Actions may also lack runner admission.
- No assertion that a verified world revision exists. The true server-side Life Graph snapshot identity/revision and revocation propagation into scenario creation remain the next distinct integration item.

## Next executable actions
1. Run `pnpm install --frozen-lockfile`, `pnpm --dir apps/functions build`, then `node --test apps/functions/test/provider-scenario-canonical-consent.test.js apps/functions/test/scenarioCouncilBundle.test.js` at the exact branch HEAD in an authorized CI/Node22 environment.
2. Run existing `provider-scenario-consent-proof` workflow (if GitHub Actions runner is admitted); retain exact SHA and logs, and fix any actual failure on this child only.
3. Plan a separately scoped server-verified graph-snapshot revision contract before any UI or AI system claims scenario state is synchronized with a persistent living world.
4. Keep public launch NO-GO / HOLD pending original release-controller review, private E2E, literal visual/device evidence, and protected production acceptance.

This child must remain draft and must not be merged directly to production or used as approval to activate providers.


## Continuation — source-admission repair (2026-11-03)
- Reused the original `resolveAuthorizedScenarioEvidence` transactional reader. **No alternate evidence service or duplicate scenario API** was introduced.
- Found that `memories/{id}` and `lifeEntities/{id}` were admitted for scenario use upon `exists` without consistent owner, deleted/demo/synthetic/revoked, or entity-kind checks.
- Added fail-closed checks before references are added: memory `ownerId ?? userId`, `deleted`, `demo`, `synthetic`, `consentState` pending/revoked; entity `ownerId`, selected `kind`, `revoked`, `synthetic`, `status` superseded/revoked.
- Repaired the existing compiled-VM test fixture to use current owned records (instead of previously synthetic records) and Firestore `get(key)` snapshot access.
- Added a synthetic negative test matrix for revoked, deleted, demo, synthetic, foreign-owner, wrong-kind and superseded selections; one test forbids an explicit invalid record from silently falling back to assumption-only; one positive test preserves three admitted records.
- Scope remains a **metadata filter**, not a full proof of graph fixity, private-source receipts, lineage, durable revocation propagation, provider calibration, or a live persistent-world release.
- Node 22 typecheck, original compiled Functions VM tests and the full E2E/consent lifecycle remain **not run / not passing**. At prior PR head `1fff231763fa92c64dca7a91a4230bc4a3b699fc`, scenario workflow run 41603811770 returned failed with zero job steps, no retrievable log. This is unclassified infrastructure/test admission evidence, not proof of a source failure or success.
- Next: verify exact new head in admitted Node22 environment; inspect new runner logs (do not bypass release gates); then integrate canonical graph snapshot provenance using the existing Life Graph authority, not a parallel store.


## Continuation — source-backed Council reauthorization on read (2026-11-03)
- Existing `getPossibleFutureCouncilBundle` exposed a minimal stored hypothetical summary and evidence-class counts to a consenting browser, which can then send that context to an external provider. Previously it did not recheck whether the *stored source-backed basis* still matched the owner's current canonical consent policy.
- Added current-policy validation before a source-backed bundle can be released: owner-canonical stored policy, `fully-enforced` state, exact saved source-policy revision, and currently granted/limited model-context permission in the matching memory/models domain. Empty-evidence assumption-only bundles preserve the prior no-private-policy-read behavior.
- Reused `consentPolicyAuthority.isCanonicalStoredPolicy`; no new privacy authority.
- Extended the existing compiled VM Council-bundle test file with a valid canonical synthetic policy and cases for current permission, revoked domain/context, stale revision, pending enforcement, foreign/malformed/missing policy, and model-domain revocation.
- Read guard **does not yet revalidate each underlying source's live revocation/deletion or ensure atomic source-policy consistency with external provider dispatch**. Those are distinct outstanding acceptance issues. Do not use this change to claim a fully source-certified persistent Council.
- Static check performed on source blobs (10/10 checks); the two JavaScript test files parse as JavaScript. No original Node22 compilation, test execution, or private E2E was performed.
