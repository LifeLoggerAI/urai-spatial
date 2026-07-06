# URAI Ecosystem Receipt Index

Date: 2026-07-06  
Certification state: **NOT RELEASE-CAPABLE**

A commit or green source check is not a production deployment receipt. Every status below states the strongest evidence actually available.

## REC-FOUNDATION-20260706-01

- Repository: `LifeLoggerAI/urai-foundation`
- Branch: `foundation-audit-20260706`
- Pull request: #11
- Exact head: `3b14a15e9347d0c0b7bf06842eb552d97d1e28be`
- Material actions: production-truth hierarchy, allowlisted `_site` build, standards registry/schema/tests, expanded governance/ethics/transparency/risk policy, product integration contract, publication/correction policy, accountable templates, provider-neutral live smoke.
- Workflow runs: Check `28772569941`; Documentation validation `28772569991`.
- Validation: queued/pending; not certified.
- Deployment: none.
- Remaining blockers: canonical host, DNS/TLS, deployed/rollback SHA, private security channel, legal/license and accessibility review.

## REC-SPATIAL-20260706-01

- Repository: `LifeLoggerAI/urai-spatial`
- Main inspected: `f55ad9f08a80d502c85538300907dcb7f1566212`
- External result: Ground, Life Map, Focus, Replay, Mirror and Passport return distinct content; `/privacy-controls/` returns the Home threshold while `/status/` labels it live.
- Source result: dedicated Privacy Controls and Focus owners exist; static hosting has zero rewrites; deploy workflow uses service-account credentials.
- Deployment/rollback SHA: unknown.
- Status: source repair exists; live deployment parity is BLOCKED.
- Tracking: issues #414 and #422; gate PR #420.

## REC-SPATIAL-20260706-02

- Repository: `LifeLoggerAI/urai-spatial`
- Pull request: #419
- Branch: `ops/ecosystem-completion-ledger-20260706`
- Current material commits:
  - `912bae89c37478e436aac47c72bbabe4ee4e65d4` — deduplicated completion ledger with Foundation, Studio and Asset Factory execution state.
  - `37d62d3927ce627792b918f2e9cd7f0ffd4c4c60` — canonical V1-V5 authority correction.
- Result: all 19 accessible repositories, status vocabulary, dependencies, version ladder, blockers and receipt locations are centralized.
- Validation/deployment: exact-head workflows pending; no deployment.

## REC-SPATIAL-20260706-03

- Repository: `LifeLoggerAI/urai-spatial`
- Pull request: #420
- Branch: `audit/ecosystem-completion-ledger-20260706`
- Material actions: reconcile `STATUS.md`; enforce dedicated Privacy Controls source, canonical Focus fingerprint, `urai-tier1/out`, clean URLs, trailing slashes and zero rewrites.
- Result: IMPLEMENTED BUT NOT DEPLOYED.
- Validation: exact-head Spatial workflows queued; release/deploy runs have also been cancelled by the current workflow backlog/concurrency history.
- Deployment: none.

## REC-SPATIAL-20260706-04

- Repository: `LifeLoggerAI/urai-spatial`
- Pull request: #415
- Exact head last inspected: `a5d9e75d39360d6d0ac472f819cacec4cd200990`
- Material action: V50 deterministic runtime, release receipt, route contract, compile/typecheck/build/smoke and evidence workflow.
- Validation: exact-head workflows queued/pending; V50 receipt artifact not yet inspected.
- Status: IMPLEMENTED BUT NOT CERTIFIED OR DEPLOYED.

## REC-ASSET-20260706-01

- Repository: `LifeLoggerAI/asset-factory`
- Pull request: #141
- Exact head: `1029f4582e661272ecb643ebdbca1f1eca364944`
- Material actions: canonical V1=53, V2=80, V3=14, V4=39, V5=27 contract; explicit paid authorization; provider-call, retry and dollar ceilings; zero-call plans and checks.
- Workflow runs: Production Checks `28772411495`; CI `28772411494`; Production Verify `28772411497`; Pipeline Proof `28772411509`; Release Readiness `28772411521`; Image Asset Generator `28772411523`; Production Readiness `28772411555`.
- Validation: queued; no provider call.
- Duplicate disposition: weaker overlapping PR #143 closed without merge.
- Paid generation/promotion: BLOCKED pending explicit user authorization, valid billing, exact price/ceiling and provider receipt.

## REC-ASSET-20260704-02

- Repository: `LifeLoggerAI/asset-factory`
- Main merge: `bda96f72c86186abc553947dddd66360e12bfc26`
- Prior workflow evidence: Production Readiness `28700054134`, Production Checks `28700054120`, Production Verify `28700054115`, Release Readiness `28700054146`, Pipeline Proof `28700054125`, CI `28700054144` passed.
- Provider result: Final V1 Avatar Extension run `28700054127`, job `85117698288`, artifact `8080065637` failed after three bounded attempts with `billing_hard_limit_reached`; promotion was skipped.
- Status: repository diagnostics verified; provider promotion BLOCKED.

## REC-STUDIO-20260706-01

- Repository: `LifeLoggerAI/urai-studio`
- Pull request: #56
- Exact head: `cdf55d66cec89df5a5745fd628050d041a2be563`
- Material actions: token-bound tenant identity; terminal max-attempt job handling; enum validation; server-authorized Studio/membership creation; active membership and RBAC checks; immutable tenant IDs; server-owned worker/output/dead-letter/audit state; Storage role alignment; source guards; ADR-005 migration/rollback plan.
- Workflow runs: Studio CI `28773264693`; Studio Audit `28773264722`; Production Verify `28773264746`; Health Guard `28773264721`.
- Validation: queued/pending; not deployed.
- Blocker: issue #52 remains open for trusted lifecycle, membership migration, Firebase emulator matrix, review and rollback evidence.

## REC-COMMS-20260706-01

- Repository: `LifeLoggerAI/urai-communications`
- Branch: `audit/delivery-callback-hardening-20260706`
- Head SHA: `a9a1a254292db1919582db56a81a7a5c3829967a`
- Pull request: #27
- Result: fail-closed callback status/provider handling, recursive payload redaction, deterministic event IDs and regression tests implemented.
- Workflow runs: CI `28772012252`; Production Verify `28772012234`.
- Validation: queued; not deployed.
- Caveat: provider-native callback authentication remains issue #23.

## REC-JOBS-20260703-01

- Repository: `LifeLoggerAI/urai-jobs`
- Main: `f364c5b8497203d886108e22d262bb9460604ec4`
- Result: typed V1-V5 release sequencing model and verifier exist.
- Status: VERIFIED IN REPOSITORY as plan-only; `readyForExecution: false`; no deployed worker receipt.

## Required production receipt fields

- receipt ID and UTC timestamp;
- repository, branch, exact source/tested/target/deployed/rollback SHAs;
- pull request or issue and changed files;
- workflow run, job, artifact and digest;
- exact commands and results;
- build and security/accessibility results;
- project/environment and deployment output;
- public URL and external route/user-flow proof;
- provider IDs, attempts, cost, asset counts and checksums where applicable;
- rollback command and verification;
- remaining caveats.

## Missing critical receipts

- current Spatial V50 full release artifact;
- exact `urai-4dc1d` deployed and rollback SHAs;
- corrected live Privacy Controls and evidence-aware Status deployment;
- Focus clean/slash/query parity and negative missing-route proof;
- Studio exact-head all-green artifact, emulator RBAC proof and membership migration;
- successful provider render/promotion receipt;
- V2 80/80, V3 14/14, V4 39/39 and V5 27/27 provider/promotion receipts;
- Privacy export/deletion/revocation/retention receipts;
- Jobs/Admin/Analytics/Content/Staging deployed integration receipts;
- physical Quest validation;
- legal/IP authority reconciliation using `URAI IP Holdings LLC`.
