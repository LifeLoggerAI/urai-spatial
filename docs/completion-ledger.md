# URAI Completion Ledger Mirror

Date: 2026-07-06

Canonical public application: `LifeLoggerAI/urai-spatial/urai-tier1` on `main`.

Authority boundary: PR #415 owns the machine-readable completion ledger, release receipt, deployed/rollback identity, Status evidence, and production deployment gate. This human-readable mirror does not authorize deployment or certify completion.

This ledger uses only: VERIFIED LIVE, VERIFIED IN REPOSITORY, IMPLEMENTED BUT NOT DEPLOYED, PARTIALLY IMPLEMENTED, BLOCKED, ROADMAP, and REJECTED OR OBSOLETE.

Current P0 items:

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| PUB-001 | Exact deployed SHA | BLOCKED | The SHA currently serving `urai.app` is not recorded in an immutable deployment receipt. PR #415 defines the receipt boundary but does not establish the value. |
| PUB-002 | Rollback SHA before deploy | BLOCKED | No previously deployed and externally verified rollback SHA is recorded. |
| PUB-003 | Privacy Controls live parity | BLOCKED | The live path still serves Home content; source correction is in PR #433 and exact-SHA parity evidence belongs to PR #431. |
| PUB-004 | Status production truth | BLOCKED | The live Status surface does not record tested, deployed, and rollback SHAs; canonical source work is in PR #415. |
| PUB-005 | Production runtime proof | BLOCKED | Deployment, monitoring, signed-in flow, and rollback evidence are incomplete. |
| PRIV-001 | Cross-system consent and data-rights enforcement | PARTIALLY IMPLEMENTED | Privacy source work is open; environment and cross-service receipts remain required. |
| JOB-001 | Secure idempotent worker lifecycle | PARTIALLY IMPLEMENTED | Jobs PR #75 is the current hardening branch; exact-head checks and staging lifecycle proof remain required. |
| AST-001 | Canonical V1-V5 asset contract and paid-run controls | PARTIALLY IMPLEMENTED | Asset Factory hardening remains open; exact-head checks, legacy-entry retirement, and provider receipts remain required. |
| OPS-001 | Central environment and receipt registry | PARTIALLY IMPLEMENTED | Human mirrors exist; machine-ledger authority remains PR #415. |
| OPS-002 | Exact-head CI execution | BLOCKED | Required jobs remain queued without logs; workflow-consolidation issue #439 is open. |
| LEGAL-001 | Entity-name consistency | BLOCKED | Legal ownership language requires qualified review and authoritative records. |

A workflow definition, source branch, route response, or document entry is not a production receipt.
