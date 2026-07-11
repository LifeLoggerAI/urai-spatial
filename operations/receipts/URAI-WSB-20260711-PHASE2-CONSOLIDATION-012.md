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
- Final source head before this receipt: `5ad4f5560719dcaa99412cb804f675e3ee35c8f7`
- PR state at recording: open, draft, mergeable
- Candidate inventory: 35 source/control files plus this receipt

## Incorporated authorities

The Phase 2 branch contains the source work previously isolated in #552, #575, #577, #578 and #579. Nothing was merged to `main`.

## Consolidated source boundaries

The candidate preserves target-build isolation, clean authority attestation, immutable actions, managed ephemeral credentials, repository/authority/run/release/rollback/fingerprint provenance, exact live route/query/SHA identity, pre-request noncanonical traffic blocking, fail-closed asset realpath validation and candidate-aware sensory fallbacks.

## CI execution and authority-audit repairs

GitHub-hosted runner assignment resumed and produced real results.

On stale head `7fc065c4afa43585516c9619882da7f058ee6c9b`, XR Static Gate Diagnostics and Spatial Missing Resource Diagnostics succeeded while Release Security Path Guard failed in `Audit production workflow authority`. The first defect was a stale schema-2 assertion after the release-control smoke advanced to schema 5.

On stale head `53eb1c7e8c6cf2de5d23d9c6341e112ad1d9b233`, the same diagnostics succeeded and the security gate failed again after all preceding security steps passed. The second defect was reference-based production detection that classified a read-only verifier as production-capable.

On stale head `6dff0fec84c1b146dad1bcb53e65a2ed0ef6aa52`, the security gate again reached the authority-audit step after checkout, exact identity, Node setup, syntax, guard immutability and action-pin verification passed. The full audit message remained hidden behind full-history checkout output.

Authority-audit repairs now provide:

- exact-head shallow checkout only for the read-only security workflow; the protected production workflow retains full-history ancestry checks;
- actual mutation-execution detection rather than passive path references;
- executable uniqueness delegated to `verify-release-credential-boundary.mjs`, which runs immediately after the authority audit;
- build/attestation/deploy separation, exact action pins, secret confinement, operator guards, bundle provenance, schema-v5 smoke, exact query identity and pre-request network blocking;
- explicit GitHub annotations under schema `urai-production-authority-audit-7`.

## Current-head diagnostic artifact review and false-green repair

On stale receipt-bearing head `9137f1fa48c1c442431b2280ece509e3a60ab553`:

- XR Static Gate Diagnostics completed successfully and retained artifact `8253559742`, digest `sha256:9c02d712867b917d8a4b110832c4fdf83b55c3e95d7c6cb5873c068424af5233`.
- Spatial Missing Resource Diagnostics completed successfully and retained artifact `8253569246`, digest `sha256:39fda45245aee8c7654db4567f488b78336a1eb806803083f4ef2a014463d038`.

Artifact inspection showed that the old missing-resource workflow was report-only: it exited successfully even when `missing-resources.json` contained aborted RSC/HMR requests and three attempted Firestore listeners against project `urai-local`.

That false-green boundary is repaired:

- the diagnostic explicitly neutralizes public Firebase configuration and disables manifest Firestore before starting the fallback/demo Next process;
- browser routing blocks every non-local request before send;
- only bounded local `_rsc` navigation aborts and Next HMR hot-update aborts are ignored;
- HTTP errors, invalid URLs, external attempts and all other failed requests are actionable;
- any actionable finding exits nonzero;
- the report is schema-bound as `urai-spatial-missing-resource-diagnostics-2`;
- the workflow uses exact-head checkout, immutable checkout/setup-node/upload-artifact pins, exact pnpm 10.0.0, clean source identity and 30-day retained evidence;
- `spatial-missing-resource-diagnostic-contract.test.mjs` locks the provider-neutralization, pre-send blocking, bounded-ignore, nonzero-exit and workflow-authority markers into both focused unit runners.

The prior green missing-resource conclusion is therefore diagnostic evidence of a repaired false-pass condition, not accepted final gate evidence.

Every conclusion from `9137f1fa...` and all earlier heads is stale for final gating.

## Final changed-file inventory

The consolidated candidate changes exactly 35 non-receipt files. Relative to the prior 32-file source boundary, the only new paths are:

- `.github/workflows/spatial-missing-resource-diagnostics.yml`;
- `tests/spatial-missing-resource-diagnostic.mjs`;
- `urai-tier1/tests/spatial-missing-resource-diagnostic-contract.test.mjs`.

The existing focused runners and unit-runner coverage file were already governed files and now include the new contract. This receipt is the thirty-sixth changed file.

## Evidence rule

Only workflows attached to the receipt-bearing final branch head may gate incorporation or deployment. Queued, skipped, cancelled, stale-head, false-green or different-head results are not passing evidence.

## Mutation receipt

- Merge to `main`: not performed
- Production deployment or rollback: not performed
- Firebase or production-data mutation: not performed
- Production credential materialization: not performed
- Provider call: not performed by the repair; stale diagnostic evidence recorded blocked/aborted provider attempts
- Billing/spend: none established
- Asset promotion beyond the reviewed candidate boundary: not performed
- Public launch or certification: not authorized

## Remaining terminal gate

Production certification remains blocked until all required workflows execute successfully on one unchanged exact head, retained logs and artifacts are available and inspected, independent release/security/privacy and asset review are recorded, the tested SHA is merged without drift, and a protected exact-SHA release produces deployed-SHA, rollback-SHA, fingerprint, route/domain, browser and recovery receipts.
