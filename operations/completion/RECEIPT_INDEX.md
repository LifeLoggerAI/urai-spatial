# URAI Receipt Index

This index records material claims that already have concrete identifiers and separates them from unresolved production evidence.

## Canonical Spatial receipts

| Receipt ID | Claim | Repository / SHA | Workflow / artifact | Result | Scope boundary |
| --- | --- | --- | --- | --- | --- |
| `SP-V50-FAIL-001` | First v50 certification attempt exposed the root compile defect | `LifeLoggerAI/urai-spatial` PR #415 merge candidate `828ef3a683ead9f9d5ba786e262051c2beacb1da` | Run `28771244676`; artifact `8100959650`; digest `sha256:053998d092371c22aa71ca0ff8c7ac82b5f695a712af6fae7d9cf3a0b3a494e4` | FAILED at runtime compile | Proves the failure and exact compiler output only |
| `SP-V50-CANDIDATE-002` | Explicit SystemLoop closure, completion ledger and receipt index candidate | PR #415 branch `audit/ecosystem-truth-20260706` | Exact-head V50 workflow pending | IN CERTIFICATION | No passing or deployment claim until exact current head completes |
| `SP-MAIN-BASE-001` | Authenticated base used by PR #415/#416 | `main@b0e29681956e2892f3c38d1cf5f99ffa8da1ec57` | PR metadata | VERIFIED IN REPOSITORY | Not a deployed-SHA receipt |
| `SP-LIVE-DRIFT-003` | `/privacy-controls/` source/live content mismatch | source `main@b0e296...`; external fetch 2026-07-06 | issue #414 comment `4889771786` | VERIFIED LIVE DEFECT | Does not establish which SHA is deployed |

## Asset Factory receipts

| Receipt ID | Claim | Repository / SHA | Workflow / artifact | Result | Scope boundary |
| --- | --- | --- | --- | --- | --- |
| `AF-CONTRACT-CANDIDATE-001` | One V1–V5 forge authority plus zero-call cost envelope | `LifeLoggerAI/asset-factory` PR #143 head `66d04a594bb8020887153f4ca697e91a67dee598` | Canonical Asset Version Contract run `28772490736` | QUEUED at index update | No provider call, asset promotion or actual-cost claim |

## Privacy receipts

| Receipt ID | Claim | Repository / SHA | Workflow / artifact | Result | Scope boundary |
| --- | --- | --- | --- | --- | --- |
| `PRIV-AUTHORITY-CANDIDATE-001` | Privacy docs name `urai-spatial/urai-tier1/main` as canonical and narrow live claims | `LifeLoggerAI/urai-privacy` PR #90 head `03e26b6f55ee84d1e51df4cc557327da2f666009` | Privacy exact-head workflows queued | IN CERTIFICATION | Documentation truth only; no authenticated privacy workflow claim |

## Analytics receipts

| Receipt ID | Claim | Repository / SHA | Workflow / artifact | Result | Scope boundary |
| --- | --- | --- | --- | --- | --- |
| `AN-TRUST-001` | B2B schema, network-address log redaction and explicit rollback preflight hardening | `LifeLoggerAI/urai-analytics` PR #27 head `10a9b39def2229f81e1b91d93881cc9cde1f3034`; squash merge `125b5fc7c8f7bd783bc9a581f1d2eeced56eb3b4` | Privacy adoption run `28771605316`; Analytics CI run `28771605324` | MERGED, EXACT-HEAD CHECKS PASSED | Repository proof only; analytics production deployment remains unverified |

## Storytime receipts

| Receipt ID | Claim | Repository / SHA | Workflow / artifact | Result | Scope boundary |
| --- | --- | --- | --- | --- | --- |
| `ST-PR24-CI-001` | Storytime app install/lint/typecheck/tests/static validation/build and Functions build | `LifeLoggerAI/urai-storytime` PR #24 head `d43b4a661744f2e896a7b53d1c20782997a9add1` | Run `28771433960` | PASSED; production-only job skipped | Repository/PR proof, not deployment |
| `ST-PR24-VERIFY-002` | Dedicated Storytime verification command and receipt generation | same head | Run `28771433985` | PASSED | Receipt proves command execution only |
| `ST-PR24-MERGE-003` | Merge attempt | PR #24 | Connector merge action | BLOCKED by connector safety | PR remains unmerged; no deployment claim |

## Repository inventory receipt

| Receipt ID | Claim | Evidence | Result |
| --- | --- | --- | --- |
| `ORG-INVENTORY-001` | Accessible LifeLoggerAI URAI repository set and write authority | GitHub installed-repository search on 2026-07-06 | VERIFIED IN REPOSITORY for returned repositories; does not prove deployment |

## Drive authority receipts

| Receipt ID | Document | Evidence role |
| --- | --- | --- |
| `DRV-ARCH-001` | `URAI System Architecture Spec v1` | Confirms canonical public repository, runtime root, domain/project intent, repository roles and v50 gate |
| `DRV-VERS-002` | `URAI OS Final Layer Spec` | Defines v50/v100/v150/v200 as evidence-gated states and names PR #415 as the active v50 repair |
| `DRV-COCKPIT-003` | `URAI Brain Map — Interactive OS Cockpit Spec (Live)` | Defines evidence-backed operational cockpit requirements and current PR/run posture |

## Missing production receipts

The following receipts do not yet exist and must not be inferred:

- exact current deployed SHA for `urai.app`;
- distinct rollback SHA and successful rollback smoke;
- immutable production manifest and asset-pack SHA;
- verified Firebase project/site deployment receipt for the current candidate;
- current custom-domain desktop/mobile/deep-link/query parity artifact;
- V2 80/80, V3 14/14, V4 39/39 and V5 27/27 provider receipts;
- actual provider unit prices, approved batch ceiling and total-spend receipt;
- authenticated data export/delete/revocation receipt;
- production service-contract and worker-lifecycle receipt;
- real Quest/WebXR physical-device receipt;
- monitoring alert, backup restore and incident-response receipts.

## Receipt update rule

Every new receipt entry must include the exact repository, branch/ref, commit SHA, PR/issue, changed files or contract, workflow run, test/build result, deployment target where applicable, public URL/runtime check where applicable, provider or asset receipt where applicable, rollback SHA where applicable, and remaining caveats.
