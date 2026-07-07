# URAI Asset Manifest

Source of truth: `urai-tier1/src/spatial/assets/assetManifest.ts`.

Each entry records:

- `id`
- `name`
- `type`
- `path`
- `status`
- `targetSurface`
- `priority`
- `notes`
- `createdAt`
- `updatedAt`
- optional `fallbackAssetId`
- optional `generationPromptId`

## Status values

- `ready`: the file exists and can be loaded.
- `placeholder`: runtime procedural fallback is intentional.
- `future`: a planned asset slot awaiting generation or import.
- `missing`: a broken or unresolved slot that should be fixed.

## Surfaces

`home`, `ground`, `life-map`, `focus`, `replay`, `passport`, `status`, `ar-vr`, and `global`.

## Validation

Run:

```bash
pnpm --dir urai-tier1 assets:validate
```

The validator writes `docs/ASSET_VERIFICATION_REPORT.md` and fails only when a critical asset marked `ready` is missing or an asset has an invalid extension.
