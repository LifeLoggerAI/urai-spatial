# URAI Completion Ledger

Date: 2026-07-06

Canonical public application: `LifeLoggerAI/urai-spatial/urai-tier1` on `main`.

Authority boundary: PR #442 on `release-authority-20260706` is the current production-release authority candidate. It implements a manual exact-SHA deployment, rollback rehearsal, immutable receipt, route identity, screenshot, and accessibility contract. It does not establish the currently deployed SHA or authorize deployment without the required evidence inputs.

This ledger uses only: VERIFIED LIVE, VERIFIED IN REPOSITORY, IMPLEMENTED BUT NOT DEPLOYED, PARTIALLY IMPLEMENTED, BLOCKED, ROADMAP, and REJECTED OR OBSOLETE.

## Current P0 items

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| PUB-001 | Exact deployed SHA | BLOCKED | The SHA currently serving `urai.app` is not recorded in an immutable deployment receipt. PR #442 requires it before any production change but does not establish it. |
| PUB-002 | Rollback SHA before deploy | BLOCKED | No previously deployed and externally verified rollback SHA is recorded. PR #442 requires rollback SHA to equal the proven current deployed SHA. |
| PUB-003 | Privacy Controls live parity | BLOCKED | `https://urai.app/privacy-controls/` serves Home threshold content. The dedicated source owner exists, but exact-SHA deployment and live parity proof are pending. |
| PUB-004 | Focus slash/query parity | BLOCKED | `/focus/` serves the selected-memory chamber while `/focus?memoryId=quiet-reset` serves a legacy URAI shell. |
| PUB-005 | Status production truth | BLOCKED | The live Status surface claims `Mode Launch` and `/privacy-controls live` without tested, deployed, and rollback SHAs. |
| PUB-006 | Production runtime proof | BLOCKED | Exact-head CI, deployment, signed-in flow, monitoring, screenshot, accessibility, rollback, and restored-target evidence are incomplete. |
| PRIV-001 | Cross-system consent enforcement | PARTIALLY IMPLEMENTED | Fail-closed consent and data-rights source work is open in `urai-privacy`; emulator, downstream, staging, and live receipts remain required. |
| JOB-001 | Secure idempotent worker lifecycle | PARTIALLY IMPLEMENTED | Jobs PR #75 contains the current source hardening; exact-head checks and staging lifecycle proof remain required. |
| AST-001 | Canonical V1-V5 asset contract and paid-run controls | PARTIALLY IMPLEMENTED | Asset Factory PR #141/#148 source work remains open. Paid generation is prohibited until the canonical contract is green/merged, a zero-call dry run is reviewed, credentials/balance exist, and maximum calls/dollars are explicitly authorized. |
| OPS-001 | Central environment and receipt registry | PARTIALLY IMPLEMENTED | Human and repository receipts exist, but production environment identity, monitoring, backups, restore, and cross-service receipts remain incomplete. |
| OPS-002 | Exact-head CI execution | BLOCKED | Required Spatial checks have repeatedly remained queued/cancelled; no passing exact-head artifact has been accepted for production. |
| OPS-003 | One canonical deployment authority | IMPLEMENTED BUT NOT DEPLOYED | PR #442 disables automatic push/PR deployment and requires manual exact-SHA authority, workload identity, rollback exercise, and immutable evidence. |
| XR-001 | Physical Quest/device certification | BLOCKED | Source implementation exists; no physical headset/controller/comfort/performance receipt exists. |
| LEGAL-001 | Entity-name and ownership consistency | BLOCKED | `URAI IP Holdings LLC` is the intended IP-holding entity and `URAI Labs LLC` the operating entity, but legal execution and authoritative records require qualified review. |

A workflow definition, source branch, HTTP 200 response, route label, or document entry is not a production receipt.

## Immediate closure order

1. Complete and inspect exact-head CI for the consolidated Spatial candidate.
2. Establish the exact SHA currently serving `urai.app` and a verified rollback SHA without changing production.
3. Dispatch the manual production workflow only with those proven identities and the exact current `main` SHA.
4. Verify Privacy Controls, Focus query parity, Status truth, desktop/mobile accessibility, screenshots, monitoring, rollback deployment, rollback smoke, and target restoration.
5. Promote no paid assets and make no provider-active claims until their separate cost, provider, provenance, and runtime gates are complete.
