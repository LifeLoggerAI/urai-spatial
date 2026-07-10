# URAI Real Spatial Models V1

## Scope

This change replaces node-only and recycled placeholder glTF files with deterministic, self-contained glTF 2.0 models containing real vertices, faces, normals, indices, materials, and embedded buffers.

The first modular pack contains 14 runtime fallback assets:

1. Entry chamber shell
2. Entry floor ring
3. Central orb
4. Universal portal ring
5. Ground descent hatch
6. Ground room shell
7. Ground terminal
8. Agent source station
9. Life Map sky dome
10. Memory star node
11. Focus star tunnel
12. Replay film portal
13. Passport identity plinth
14. Status control board

## Runtime and authority boundary

The generator writes to the existing procedural proof/fallback paths loaded by `SpatialWorldAssetLayer.tsx`:

`urai-tier1/public/assets/urai/spatial/**/models/*.gltf`

These paths are stable runtime fallbacks. They are not the selected production-asset namespace.

The selected production namespace is:

`urai-tier1/public/assets/urai/generated/**`

A later manifest-driven resolver may select a reviewed asset from the generated namespace and fall back explicitly to these proof models when no selected asset is ready. These models must never silently override a reviewed selected asset.

The machine-readable classification is recorded in:

`operations/assets/spatial-proof-fallbacks-v1.json`

## Generation

```bash
python -m pip install numpy==2.2.6 trimesh==4.11.1
python scripts/generate-real-spatial-models-v1.py
```

The GitHub Actions workflow `Forge real spatial models v1` runs the same command and commits the generated fallback models and receipt to the feature branch.

## Verification contract

The generated receipt is written to:

`docs/generated/spatial-models-v1-receipt.json`

The workflow fails unless:

- all 14 model paths exist;
- every model has non-zero vertices and faces;
- the pack contains at least 20,000 vertices;
- the pack contains at least 40,000 faces;
- receipt byte counts match files on disk;
- the fallback inventory exists and identifies the generated namespace as selected production authority.

The locally verified deterministic output contains 23,712 vertices and 46,776 faces across the 14-model pack.

## Status language

These are real modular first-pass proof/fallback models. They replace empty geometry and prove the complete runtime loading path, but they are not final art and must not be described as selected production assets.

Authored textures, UVs, animation rigs, LOD variants, collision variants, baked lighting, device-specific optimization, route-level visual review, compression, provenance receipts and final selection remain separate production-art gates.

## Rollback

Rollback is a normal revert of the generated-model commit. The fallback runtime paths remain stable, so earlier proof files or later improved fallback models can be restored independently without changing the selected production namespace.
