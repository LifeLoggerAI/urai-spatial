# URAI Workstream B — Phase 2 Consolidation Receipt

Receipt ID: `URAI-WSB-20260711-PHASE2-CONSOLIDATION-012`

Recorded: 2026-07-11

Classification: `SOURCE-CONSOLIDATED / ACTIVE-CI-REPAIR / NOT DEPLOYED / NOT CERTIFIED`

## Canonical authority

- Repository: `LifeLoggerAI/urai-spatial`
- Canonical production branch: `main`
- Canonical main SHA: `60730edcb5bcedfe2ded2cee9a96cef96dff9510`
- Consolidated Phase 2 PR: `#539`
- Consolidated branch: `release/protected-rollback-authority-20260711-v2`
- Final source head before this receipt: `5a785d31f1d2a9be7863bdc407f405ac46ff7930`
- PR state at recording: open, draft, mergeable
- Candidate inventory: 32 source/control files plus this receipt

## Incorporated authorities

The Phase 2 branch contains the source work previously isolated in #552, #575, #577, #578 and #579. Nothing was merged to `main`.

## Consolidated source boundaries

The candidate preserves target-build isolation, clean authority attestation, immutable actions, managed ephemeral credentials, repository/authority/run/release/rollback/fingerprint provenance, exact live route/query/SHA identity, pre-request noncanonical traffic blocking, fail-closed asset realpath validation and candidate-aware sensory fallbacks.

## CI execution and repairs

GitHub-hosted runner assignment resumed and produced real results.

On stale head `7fc065c4afa43585516c9619882da7f058ee6c9b`, XR Static Gate Diagnostics and Spatial Missing Resource Diagnostics succeeded while Release Security Path Guard failed in `Audit production workflow authority`. The first defect was a stale schema-2 assertion after the release-control smoke advanced to schema 5.

On stale head `53eb1c7e8c6cf2de5d23d9c6341e112ad1d9b233`, the same diagnostics succeeded and the security gate failed again after all preceding security steps passed. The second defect was reference-based production detection that classified a read-only verifier as production-capable.

On stale head `6dff0fec84c1b146dad1bcb53e65a2ed0ef6aa52`, the security gate again reached the authority-audit step after checkout, exact identity, Node setup, syntax, guard immutability and action-pin verification passed. The full audit message remained hidden behind full-history checkout output.

Final audit and diagnostic repairs:

- the read-only security workflow checks out only the exact head with `fetch-depth: 1`; the protected production workflow retains full-history ancestry checks;
- the security workflow remains read-only, credential-free and production-mutation-free;
- production workflow detection now requires an actual deploy command, not passive references;
- executable uniqueness is delegated to `verify-release-credential-boundary.mjs`, which runs immediately after the authority audit;
- the audit validates build/attestation/deploy separation, exact action pins, secret confinement, operator guards, bundle provenance, schema-v5 smoke, exact query identity and pre-request network blocking;
- the audit emits explicit GitHub annotations and reports schema `urai-production-authority-audit-7`.

Every conclusion from `5a785d31...` before this receipt and all earlier heads is stale for final gating.

## Final changed-file inventory

The consolidated candidate changes exactly 32 non-receipt files, including the canonical production/security workflows, release operator and verifiers, release-control smoke, fail-closed asset validator, sensory manifest/runtime/contracts, package scripts and production audit documentation.

The exact inventory is the 32-file compare attached to PR #539; this receipt is the thirty-third file.

## Evidence rule

Only workflows attached to the receipt-bearing final branch head may gate incorporation or deployment. Queued, skipped, cancelled, stale-head or different-head results are not passing evidence.

## Mutation receipt

- Merge to `main`: not performed
- Production deployment or rollback: not performed
- Firebase or production-data mutation: not performed
- Production credential materialization: not performed
- Provider call: not performed
- Billing/spend: none established
- Asset promotion beyond the reviewed candidate boundary: not performed
- Public launch or certification: not authorized

## Remaining terminal gate

Production certification remains blocked until all required workflows execute successfully on one unchanged exact head, retained logs and artifacts are available, independent release/security and asset review are recorded, the tested SHA is merged without drift, and a protected exact-SHA release produces deployed-SHA, rollback-SHA, fingerprint, route/domain, browser and recovery receipts.
