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
