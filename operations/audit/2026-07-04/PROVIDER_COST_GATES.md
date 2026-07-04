# Provider Cost Gates — 2026-07-04

## Hard rule

No paid provider generation, paid cloud operation, billing upgrade, or potentially expensive batch may run unless a COST APPROVAL REQUIRED gate has been prepared and explicitly approved.

## Current provider state

- BLOCKED: V2 provider forge failed with `billing_hard_limit_reached`.
- PROVEN: Failed V2 artifact was tiny failure evidence only, not an 80-asset pack.
- PROVEN: No 80/80 provider-rendered V2 receipt exists from the inspected failed run.
- BLOCKED: V3/V4/V5 provider lanes remain blocked until cost controls and V2 proof are complete.

## Required preflight before any paid run

Every paid run must document:

1. Version and manifest path.
2. Exact number of assets requested.
3. Exact maximum output requests allowed.
4. Provider and model/service.
5. Minimum, likely, and maximum estimated cost.
6. Retry policy.
7. Existing-output check result.
8. Duplicate-prevention method.
9. Partial-output persistence method.
10. Artifact upload behavior on failure.
11. Rollback/stop condition.

## Next safe paid sequence after billing exists

Do not run the full 80-asset V2 forge first.

1. COST APPROVAL REQUIRED: one asset / one output / one round smoke.
2. Verify output file exists, metadata exists, receipt records provider renderer, and artifact uploads.
3. COST APPROVAL REQUIRED: five-asset batch.
4. Verify missing-only resume behavior.
5. COST APPROVAL REQUIRED: twenty-asset batch.
6. Only then consider full V2 missing-only forge.

## Current implementation work

- PARTIAL: `asset-factory` PR #135 adds `ASSET_FORGE_LIMIT_ENTRIES`, `ASSET_FORGE_LIMIT_OUTPUTS`, `ASSET_FORGE_SKIP_EXISTING_OUTPUTS`, and per-asset progress logs.
- NEXT: inspect failed V1 Avatar Extension preserve-result failure and decide whether #135 can safely merge or needs follow-up.
