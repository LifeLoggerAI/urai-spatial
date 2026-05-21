# Phase 6 Status: Asset Factory Integration

Status: patched, pending validation in CI or a real checkout.

## Implemented

- Added a Spatial asset package contract around existing `SpatialAssetManifest` values.
- Added package validator helpers.
- Added manifest-to-package conversion.
- Added render eligibility helper for public demo/private package boundaries.
- Added demo Spatial asset packages derived from bundled demo manifests.
- Added Phase 6 contract tests.

## Files

- `urai-tier1/src/spatial/assets/assetPackage.ts`
- `urai-tier1/src/spatial/demo/demoMemoryStars.ts`
- `urai-tier1/tests/asset-factory-phase6-contract.test.mjs`

## Integration boundary

URAI Spatial now has a package contract that can consume Asset Factory-like manifests without making live Asset Factory calls. Demo packages use bundled local assets and are marked as public demo packages.

## Not claimed

- Live Asset Factory generation.
- Production scene materialization.
- Private user asset storage readiness.
- Cross-repo deploy success.
- Asset Factory CI/deploy green status.

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

Phase 6 is fully done when focused tests pass, typecheck/build pass, and live Asset Factory status is verified or explicitly kept gated in deployment docs.
