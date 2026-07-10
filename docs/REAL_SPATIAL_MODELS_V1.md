# URAI Real Spatial Models V1

## Scope

This change replaces node-only and recycled placeholder glTF files with deterministic, self-contained glTF 2.0 models containing real vertices, faces, normals, indices, materials, and embedded buffers.

The first modular pack contains 14 runtime assets:

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

## Canonical runtime paths

The generator writes directly to the paths loaded by `SpatialWorldAssetLayer.tsx` under:

`urai-tier1/public/assets/urai/spatial/**/models/*.gltf`

No route rewrite is required. The existing `useGLTF` runtime imports receive the generated models at the same URLs.

## Generation

```bash
python -m pip install numpy==2.2.6 trimesh==4.11.1
python scripts/generate-real-spatial-models-v1.py
```

The GitHub Actions workflow `Forge real spatial models v1` runs the same command and commits the generated models and receipt to the feature branch.

## Verification contract

The generated receipt is written to:

`docs/generated/spatial-models-v1-receipt.json`

The workflow fails unless:

- all 14 model paths exist;
- every model has non-zero vertices and faces;
- the pack contains at least 20,000 vertices;
- the pack contains at least 40,000 faces;
- receipt byte counts match files on disk.

The locally verified deterministic output contains 23,712 vertices and 46,776 faces across the 14-model pack.

## Status language

These are real modular first-pass production models, not AAA final art. They are suitable for replacing empty geometry and proving the complete runtime loading path. A later art pass can add authored textures, UVs, animation rigs, LOD variants, collision variants, baked lighting, and device-specific optimization without changing the canonical URLs.

## Rollback

Rollback is a normal revert of the generated-model commit. The runtime paths remain stable, so previous placeholder files or later art-directed replacements can be restored independently.
