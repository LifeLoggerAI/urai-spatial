Deterministic Asset Pipeline (urai-spatial)

1) Put source assets in ./assets_in (glb/gltf/hdr/ktx2/etc)
2) Generate manifest:
   node scripts/asset-pipeline/hash_manifest.mjs assets_in spatial_manifest.json
3) Upload artifacts to Storage paths (admin/pipeline):
   spatial/published/assets/<sha256>.<ext>
4) Register each asset in Firestore via callable publishAsset (admin only)
5) Build platform packages -> upload build manifest to:
   spatial/builds/<platform>/<manifestSha256>.json
6) Register build via callable finalizeBuild (admin only)
