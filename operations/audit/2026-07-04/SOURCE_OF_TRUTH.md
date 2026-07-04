# URAI Source of Truth — 2026-07-04

Status labels: PROVEN, PARTIAL, BLOCKED, NOT FOUND, CONTRADICTED.

## Canonical production candidate

- PROVEN: `LifeLoggerAI/urai-spatial` is accessible, public, default branch `main`, and current connector permissions include admin/maintain/push/pull/triage.
- PROVEN: Runtime root from current operating context is `urai-tier1` pending deeper file audit.
- PROVEN: Canonical public domain candidate is `https://urai.app` pending live deployment SHA confirmation.
- PROVEN: Firebase production project candidate is `urai-4dc1d` pending Firebase metadata access.

## Asset authority

- PROVEN: `LifeLoggerAI/asset-factory` is accessible, public, default branch `main`, and current connector permissions include admin/maintain/push/pull/triage.
- PROVEN: V2 provider forge run `28699994242` failed from `billing_hard_limit_reached` and did not produce an 80/80 provider receipt.
- BLOCKED: Paid provider generation is prohibited until a COST APPROVAL REQUIRED gate is satisfied.

## Current open production-affecting PRs

- PARTIAL: `asset-factory` PR #135 adds provider cost controls and is mergeable, but one provider-adjacent V1 avatar extension workflow failed after preserve-result failure.
- PARTIAL: `urai-spatial` PR #399 is mergeable and repairs canonical asset gate manifest paths, but exact-head Spatial Lock/release-certification/live-deploy failures still require diagnosis before merge.
- BLOCKED: Provider asset promotion remains blocked until exact provider receipts exist.

## Current truth claims

- PROVEN: No valid V2 80/80 provider-rendered receipt currently exists from the failed run inspected in this audit.
- PROVEN: No Quest/physical-device validation is claimed here.
- PARTIAL: V1 has prior asset and route evidence in project history, but this audit has not yet re-proven current production desktop/mobile visual state.
- BLOCKED: V2/V3/V4/V5 provider completion cannot be claimed without receipts and deployment proof.

## Required next evidence

1. Exact deployed SHA for `urai.app` and rollback SHA.
2. Current `main` SHA and release gate state.
3. Full route live checks for `/`, `/home`, `/ground`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/passport`, `/status`, `/spatial/ar-vr`.
4. Asset ledger distinguishing manifest entries from actual provider-rendered files.
5. Merge readiness of cost-control PR #135 after non-paid checks are understood.
