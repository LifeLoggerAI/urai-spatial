# URAI Completion Ledger

Date: 2026-07-06

Canonical public application: `LifeLoggerAI/urai-spatial/urai-tier1` on `main`.

This ledger uses only: VERIFIED LIVE, VERIFIED IN REPOSITORY, IMPLEMENTED BUT NOT DEPLOYED, PARTIALLY IMPLEMENTED, BLOCKED, ROADMAP, and REJECTED OR OBSOLETE.

Current P0 items:

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| PUB-001 | Exact deployed SHA | BLOCKED | The SHA currently serving `urai.app` is not recorded in an immutable deployment receipt. PR #433 adds a verification contract but does not establish the value. |
| PUB-002 | Rollback SHA before deploy | BLOCKED | No previously deployed and externally verified rollback SHA is recorded. |
| PUB-003 | Privacy Controls live parity | BLOCKED | The live path still serves Home content; exact-SHA parity evidence is pending. |
| PUB-004 | Status production truth | BLOCKED | The live Status surface does not record tested, deployed, and rollback SHAs. |
| PUB-005 | Production runtime proof | BLOCKED | Deployment, monitoring, signed-in flow, and rollback evidence are incomplete. |
| PRIV-001 | Cross-system consent and data-rights enforcement | PARTIALLY IMPLEMENTED | Privacy source work is open; environment and cross-service receipts remain required. |
| JOB-001 | Secure idempotent worker lifecycle | PARTIALLY IMPLEMENTED | Jobs PR #75 is the current hardening branch; exact-head checks and staging lifecycle proof remain required. |
| AST-001 | Canonical V1-V5 asset contract and paid-run controls | PARTIALLY IMPLEMENTED | Asset Factory PR #148 is the current branch; exact-head checks, legacy-entry retirement, and provider receipts remain required. |
| OPS-001 | Central environment and receipt registry | PARTIALLY IMPLEMENTED | Human registers exist in PR #433; machine-ledger authority remains under separate review. |
| OPS-002 | Exact-head CI execution | BLOCKED | Required jobs remain queued without logs; tracked by issue #427. |
| LEGAL-001 | Entity-name consistency | BLOCKED | Counsel-gated reconciliation is tracked by issue #441. |

A workflow definition, source branch, route response, or document entry is not a production receipt.

See the current audit and active pull requests for lower-priority items and detailed acceptance gates.
