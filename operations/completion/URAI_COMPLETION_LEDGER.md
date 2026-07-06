# URAI Completion Ledger

Canonical machine-readable source: `operations/completion/URAI_COMPLETION_LEDGER.json`  
Program epic: #413  
Production-truth issue: #414  
Canonical public repository: `LifeLoggerAI/urai-spatial`  
Canonical runtime: `urai-tier1` on `main`

## Status meanings

- **VERIFIED LIVE** — independently exercised against the deployed environment with an exact receipt.
- **VERIFIED IN REPOSITORY** — implemented and validated against an immutable repository SHA, but not necessarily deployed.
- **IMPLEMENTED BUT NOT DEPLOYED** — source exists; environment/deployment proof is absent.
- **PARTIALLY IMPLEMENTED** — meaningful implementation exists, but acceptance criteria are incomplete.
- **BLOCKED** — a required gate cannot proceed without a concrete external or technical dependency.
- **ROADMAP** — specified future capability without completion evidence.
- **REJECTED OR OBSOLETE** — not part of the canonical release path.

## Current release spine

| Ledger ID | Requirement | Status | Immediate gate |
| --- | --- | --- | --- |
| `CORE-001` | Canonical `urai-spatial/urai-tier1/main` authority | IMPLEMENTED BUT NOT DEPLOYED | PR #415/#416 exact-head checks and merge |
| `CORE-002` | Explicit SystemLoop compile and deterministic smoke | PARTIALLY IMPLEMENTED | V50 workflow run on the current PR #415 head |
| `CORE-003` | Frozen product typecheck and production build | BLOCKED | Runtime compile must pass, then repair exact compiler failures |
| `VER-050` | v50 deterministic baseline certification | PARTIALLY IMPLEMENTED | Passing immutable v50 artifact |
| `REL-001` | Exact deployed SHA and rollback SHA | BLOCKED | Passing main SHA plus Firebase deployment authority |
| `REL-002` | Evidence-backed `/status` | PARTIALLY IMPLEMENTED | Immutable production receipt schema |
| `VER-100` | Production-integrated single-user URAI | ROADMAP | Certified v50 and cross-service contracts |
| `VER-150` | Shared spatial/provider/device-certified URAI | ROADMAP | v100, asset receipts and physical XR evidence |
| `VER-200` | Global certified platform | ROADMAP | v150 plus operational/resilience certification |

## Public product spine

| Ledger ID | Surface | Current truth |
| --- | --- | --- |
| `UX-001` | Complete route chain | Routes exist; one coherent durable user journey is not fully certified |
| `UX-002` | Ground | Visual and inspectable; embodied locomotion/collision/controller proof missing |
| `UX-003` | Life Map | Interactive generated constellation; durable private graph proof missing |
| `UX-004` | Focus and Replay | Chamber and timed playback exist; source-backed media/provenance incomplete |
| `UX-005` | Mirror and Passport | Visual ownership/reflection surfaces; operational data-rights actions incomplete |
| `XR-001` | WebXR/Quest | Preview and static gates only; physical-device certification blocked |

## Asset spine

| Ledger ID | Requirement | Current truth |
| --- | --- | --- |
| `ASSET-001` | One V1–V5 executable version matrix | Blocked by V3/V4 semantic split; Asset Factory issue #140 |
| `ASSET-002` | Global cost ceiling and cost receipts | Partial; no paid work authorized |
| `ASSET-003` | Provider-backed V2–V5 promotion | Blocked pending version/cost gates and explicit payment authority |

## Privacy, service and operations spine

| Ledger ID | Requirement | Current truth |
| --- | --- | --- |
| `PRIV-001` | Authenticated owner/tenant boundaries | Repository foundation exists; integrated live proof absent |
| `PRIV-002` | Consent/export/delete/retention/provenance | Partial; live end-to-end data-rights proof absent |
| `INT-001` | Versioned cross-service contracts | Partial and distributed across repositories |
| `JOBS-001` | Production asynchronous worker lifecycle | Source foundation exists; Cloud Run lifecycle proof absent |
| `AN-001` | Consent-safe analytics | Preview/staging only |
| `ADMIN-001` | Protected operational control plane | Source foundation exists; live auth/monitoring/rollback proof absent |
| `OPS-001` | Alerts, backup, restore, incident and disaster recovery | Blocked on production environments and operator ownership |
| `STORY-001` | Storytime truth and public-share repair | Exact-head repository workflows passed on PR #24; deployment proof absent |
| `MKT-001` | Safe public forms and complete marketing shell | Blocked by form/PII and missing-page evidence |
| `LEGAL-001` | IP-owner consistency | Must use `URAI IP Holdings LLC`; final legal review remains external |
| `LEGACY-001` | Prevent legacy deployment authority | Canonical policy exists; workflow-level negative proof must stay enforced |

## Required rule for closing an item

An item is not closed from a route returning 200, a file existing, a green mock test, a generated image, a commit message, or a document claim. Its `finalReceiptLocation` in the JSON ledger must resolve to an exact-SHA artifact, workflow, deployment, provider, device or operational receipt matching the item’s acceptance method.
