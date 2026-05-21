# Phase 6 Status: Deferred Package Contract

Status: patched, pending validation in CI or a real checkout.

## Implemented

- Added a Spatial package contract around existing `SpatialAssetManifest` values.
- Added package validator helpers.
- Added manifest-to-package conversion.
- Added render eligibility helper for public demo/private package boundaries.
- Added demo Spatial packages derived from bundled demo manifests.
- Added Phase 6 contract tests.

## Files

- `urai-tier1/src/spatial/assets/assetPackage.ts`
- `urai-tier1/src/spatial/demo/demoMemoryStars.ts`
- `urai-tier1/tests/asset-factory-phase6-contract.test.mjs`

## Integration boundary

URAI Spatial now has a deferred package contract that can consume manifest-shaped scene data without making external provider calls. Demo packages use bundled local assets and are marked as public demo packages.

## Not claimed

- External scene generation is deferred and not live.
- Production scene materialization is deferred and not live.
- Private user package storage readiness is deferred.
- Cross-repo deploy success is not claimed.
- External package CI/deploy status is pending and not live.

## Required validation

Run from repo root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter urai-tier1 test:unit
pnpm typecheck
pnpm build
pnpm launch:check
```

## Definition of done

Phase 6 is fully done when focused tests pass, typecheck/build pass, and external package status is verified or explicitly kept gated in deployment docs.
