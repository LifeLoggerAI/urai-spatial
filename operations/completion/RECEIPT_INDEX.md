# URAI Receipt Index

This index records material claims that already have concrete identifiers and separates them from unresolved production evidence.

## Canonical Spatial receipts

| Receipt ID | Claim | Repository / SHA | Workflow / artifact | Result | Scope boundary |
| --- | --- | --- | --- | --- | --- |
| `SP-V50-FAIL-001` | First v50 certification attempt exposed the root compile defect | `LifeLoggerAI/urai-spatial` PR #415 merge candidate `828ef3a683ead9f9d5ba786e262051c2beacb1da` | Run `28771244676`; artifact `8100959650`; digest `sha256:053998d092371c22aa71ca0ff8c7ac82b5f695a712af6fae7d9cf3a0b3a494e4` | FAILED at runtime compile | Proves the failure and exact compiler output only |
| `SP-V50-CANDIDATE-002` | Current explicit SystemLoop closure and completion ledger candidate | PR #415 head `f4d87994ba7341ef09f480a5e724534a867dee5b` | V50 run `28772054204` | QUEUED at index creation | No passing claim until complete |
| `SP-MAIN-BASE-001` | Current authenticated base for PR #415/#416 | `main@b0e29681956e2892f3c38d1cf5f99ffa8da1ec57` | PR metadata | VERIFIED IN REPOSITORY | Not a deployed-SHA receipt |

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
- global provider cost ceiling and total-spend receipt;
- authenticated data export/delete/revocation receipt;
- production service-contract and worker-lifecycle receipt;
- real Quest/WebXR physical-device receipt;
- monitoring alert, backup restore and incident-response receipts.

## Receipt update rule

Every new receipt entry must include the exact repository, branch/ref, commit SHA, PR/issue, changed files or contract, workflow run, test/build result, deployment target where applicable, public URL/runtime check where applicable, provider or asset receipt where applicable, rollback SHA where applicable, and remaining caveats.
