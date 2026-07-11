# URAI Workstream B — Phase 2 Consolidation Receipt

Receipt ID: `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012`

Recorded: 2026-07-11

Classification: `SOURCE CONSOLIDATED / ACTIVE CI / NOT DEPLOYED / NOT CERTIFIED`

## Authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical branch: `main`
- Canonical main SHA: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Pull request: `#539`
- Release branch: `release/protected-rollback-authority-20260711-v2`
- Audited source head before this receipt: `e30654e678db3876f7a0f5ef31081bbc6dd44740`
- Candidate scope: 37 source/control files plus this receipt

## Consolidated boundaries

The branch contains the reviewed release, rollback, credential, fingerprint, asset and sensory work previously isolated in #552, #575, #577, #578 and #579.

The current source keeps:

- target-only build and clean authority attestation;
- managed production credentials and immutable action pins;
- exact repository, authority, run, release, rollback and fingerprint identity;
- exact route/query/SHA checks and noncanonical request blocking;
- fail-closed asset path and realpath validation;
- candidate-aware sensory fallback behavior;
- production-authority audit schema `urai-production-authority-audit-7`.

## Diagnostic corrections

Two previous diagnostic workflows could report success without enforcing all recorded findings.

### Missing resources

The current diagnostic:

- disables provider configuration for the fallback/demo process;
- blocks non-local requests before send;
- ignores only bounded local navigation and HMR cancellations;
- exits nonzero on every actionable finding;
- writes schema `urai-spatial-missing-resource-diagnostics-2` evidence;
- is covered by a focused contract in both unit runners.

### XR static gates

The current diagnostic:

- runs every static gate independently;
- records each exit code;
- aggregates failures;
- exits nonzero when any gate fails;
- retains the complete log even on failure;
- is covered by a focused contract in both unit runners.

Previous diagnostic conclusions are stale after these corrections.

## Evidence rule

Only workflows attached to the receipt-bearing final head may gate incorporation or deployment. Queued, skipped, cancelled, stale-head, report-only or different-head results are not passing evidence.

## Mutation record

- Merge to `main`: not performed
- Deployment or rollback: not performed
- Firebase or production-data mutation: not performed
- Production credential materialization: not performed
- Provider activation: not performed
- Billing action: not performed
- Public launch or certification: not authorized

## Remaining gate

All required workflows must pass on one unchanged exact head with retained evidence. Independent release, security, privacy and asset review must be recorded. The tested SHA must then merge without drift, followed by protected deployment and rollback receipts for the exact deployed SHA, rollback SHA, fingerprint, custom domain, browser routes and recovery path.
