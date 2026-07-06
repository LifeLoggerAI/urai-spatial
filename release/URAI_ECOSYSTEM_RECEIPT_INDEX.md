# URAI Ecosystem Receipt Index

Opened: 2026-07-06  
Certification state: **NOT RELEASE-CAPABLE**

This index records material implementation and evidence receipts. A repository commit or passing source check is not a production deployment receipt.

## Current receipts

| Receipt ID | Date | Repository | Branch / SHA | Material action | Changed files / evidence | Workflow / test | Deployment | Rollback | Status / caveat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-STU-001 | 2026-07-06 | `LifeLoggerAI/urai-studio` | `audit/urai-studio-v50-v200-20260706`; PR #56 | Bound production tenant scope to verified identity instead of a request header | `apps/studio/lib/studio-auth.ts`; regression guard | Final-head CI rerun pending | Not deployed | Not recorded | IMPLEMENTED BUT NOT DEPLOYED; uid fallback sanitization review remains |
| R-STU-002 | 2026-07-06 | `LifeLoggerAI/urai-studio` | PR #56 | Stopped maximum-attempt jobs before artifact processing and removed undefined audit snapshots | `functions/src/job-runner.ts`; `job-runner-max-attempts.test.mjs` | Final-head Functions build/tests pending | Not deployed | Not recorded | IMPLEMENTED BUT NOT DEPLOYED |
| R-STU-003 | 2026-07-06 | `LifeLoggerAI/urai-studio` | PR #56 | Added strict job/requested-export kind validation | `apps/studio/app/api/studio/jobs/route.ts`; API regression guard | Final-head CI pending | Not deployed | Not recorded | IMPLEMENTED BUT NOT DEPLOYED |
| R-STU-004 | 2026-07-06 | `LifeLoggerAI/urai-studio` | `106827238b0f5b12a31f74caecfdc8381ef944ab` | Made Studio CI, Audit, and Production Verify preserve command receipts without weakening failures | Three workflow files | Studio Audit run `28771857566`; frozen install passed; receipt artifact `8101109322` digest `sha256:d92ebbce474e9a951f3a04d64034e70c3c17946a68fb2499ff7ef62626241ed5` | Not deployed | Not recorded | VERIFIED IN REPOSITORY; guard failure subsequently fixed |
| R-STU-005 | 2026-07-06 | `LifeLoggerAI/urai-studio` | `aef30c86ebd009bda752e2aa8ef9be61634721ab` | Removed misleading internal placeholder language from user-facing Video Factory copy | `apps/studio/app/studio/video-factory/RenderArtifactPanel.tsx` | Done-done guard rerun pending on current head | Not deployed | Not recorded | IMPLEMENTED BUT NOT DEPLOYED |
| R-SPAT-001 | 2026-07-06 | `LifeLoggerAI/urai-spatial` | `audit/ecosystem-completion-ledger-20260706`; `cd374a3765bbc96c313512db34026968664fc509` | Added canonical ecosystem completion ledger | `release/URAI_ECOSYSTEM_COMPLETION_LEDGER.md` | Spatial live-release workflow running on PR #420 | Not deployed | Not recorded | VERIFIED IN REPOSITORY |
| R-SPAT-002 | 2026-07-06 | `LifeLoggerAI/urai-spatial` | `64936c61ff5d9148bd455c086e05dc624b8efc35` | Extended production-route gate to lock Privacy Controls, Focus route ownership, and zero static rewrites | `scripts/check-production-route-exposure.mjs` | Runs through `check:production-routes` inside `lock:static` / `live:check` | Not deployed | Not recorded | IMPLEMENTED BUT NOT DEPLOYED |
| R-SPAT-003 | 2026-07-06 | `LifeLoggerAI/urai-spatial` | `8aa8da35cb797195022624051a0c97b72086aa0b` | Reconciled stale source blockers with current route, hosting, and deployment workflow evidence | `STATUS.md` | Documentation/source review; live run pending | Not deployed | Not recorded | VERIFIED IN REPOSITORY; LIVE PENDING |
| R-AF-001 | 2026-07-04 | `LifeLoggerAI/asset-factory` | PR head `3391fe115a87b871daeb547d831cd6f6a75a81a2`; merged as `bda96f72c86186abc553947dddd66360e12bfc26` | Removed blocked placeholder copy and preserved production-validation diagnostics | Pipeline proof workflow and six public pages | Production Readiness `28700054134`, Production Checks `28700054120`, Production Verify `28700054115`, Release Readiness `28700054146`, Pipeline Proof `28700054125`, and CI `28700054144` all passed | Not deployed/certified | Not recorded | VERIFIED IN REPOSITORY; production validator is green |
| R-AF-002 | 2026-07-04 | `LifeLoggerAI/asset-factory` | PR head `3391fe115a87b871daeb547d831cd6f6a75a81a2` | Preserved the Final V1 Avatar Extension provider failure without promoting incomplete output | Workflow run `28700054127`; job `85117698288`; render-log artifact `8080065637` | Secret preflight, 53-asset checkpoint restore, and refinement passed; provider render failed after three bounded attempts with HTTP 400 `billing_hard_limit_reached`; validation and promotion skipped | No provider promotion | Existing checkpoint remains rollback/reference | BLOCKED by provider billing capacity; issue #133 |
| R-JOB-001 | 2026-07-03 | `LifeLoggerAI/urai-jobs` | `main@f364c5b8497203d886108e22d262bb9460604ec4` | Added typed V1–V5 release sequencing model | Release plan source and smoke/verifier scripts | Repository verify script | Not deployed as execution worker | Not recorded | VERIFIED IN REPOSITORY as plan-only; `readyForExecution: false` |

## Receipt requirements for production completion

Each future production receipt must include:

- receipt ID and UTC timestamp;
- repository and canonical branch;
- exact source and target SHAs;
- pull request or issue;
- changed files;
- workflow run and artifact digest;
- exact test commands and results;
- build result;
- deployment target/project/environment;
- deployed SHA and public URL;
- external route/user-flow verification;
- provider receipt and asset counts/checksums when applicable;
- rollback SHA and rollback verification;
- remaining caveats.

## Missing critical receipts

- current `urai-spatial/main` full release pass;
- Firebase production deployment receipt for `urai-4dc1d` or a directly verified replacement target;
- production deployed SHA and rollback SHA;
- external `/privacy-controls/` and Focus slash/query parity proof;
- live negative-route proof showing missing exports are not masked as Home;
- current Studio PR #56 all-green CI artifact;
- Studio membership/RBAC emulator receipt;
- successful provider render and promotion receipt for the final V1 avatar extension;
- V2 80/80 and V3 39/39 provider receipts and promotion manifests;
- Privacy export/deletion/revocation receipts;
- physical Quest validation receipt.
