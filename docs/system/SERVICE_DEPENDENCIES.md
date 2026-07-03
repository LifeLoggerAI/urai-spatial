# URAI Service Dependencies

Last verified: 2026-07-03

`urai-spatial/urai-tier1` is the public experience. Supporting systems may provide assets, jobs, privacy, content, analytics, or operations, but they do not own the public runtime.

| Producer | Consumer | Contract | Evidence boundary |
| --- | --- | --- | --- |
| `asset-factory` | `urai-spatial` | Versioned manifests, checksums, optimized files, reviewed promotion PR | Workflow safety merged; paid provider proof remains separate |
| `urai-jobs` | Service callers | Job schemas, callbacks, worker endpoints, idempotency | Production hardening and environment proof remain open |
| `urai-studio` | Supporting services | Health summaries and service endpoints | Local or placeholder values are not production proof |
| `urai-privacy` | Public and admin surfaces | Consent, export, deletion, ownership, retention | Authenticated live evidence pending |
| `urai-content` | Content consumers | Schemas, seed contracts, provider evidence | Deployment intentionally blocked pending evidence |
| `urai-analytics` | Approved consumers | Consent-bound events and aggregates | Privacy-safe production proof pending |
| `urai-admin` | Operational systems | Authenticated actions and audit trails | Live authorization proof pending |
| `urai-marketing` | Public visitors | Canonical links and truthful claims | Marketing-only deployment boundary |
| `urai-communications` | Standalone pilot | Webhook and delivery contracts | Staging proof pending |
| `urai-storytime` | Standalone product | Story, safety, narration, billing, analytics | External provider and legal blockers remain |

## Failure rules

1. Missing optional services expose a truthful unavailable state.
2. Missing providers never produce synthetic success.
3. Incomplete asset handoffs cannot replace a known-good asset set.
4. Callbacks require authentication and an approved origin.
5. Jobs require bounded retries, idempotency, concurrency limits, and dead-letter handling.
6. Public pages do not expose internal diagnostics, secrets, private memories, or tenant data.
7. Cross-repository schema changes require versioned compatibility evidence.
8. Local, emulator, preview, staging, and production targets remain distinct.
