# Parallel AAA Spatial Handoff Queue - 2026-09-26

This is the authoritative consumption queue for the Spatial pixel agent. It preserves PR #1325 ownership and keeps PR #1343 candidates separate from active Spatial fallback GLTFs.

## Current Authority

- Spatial main: `4b3c7bd982865324510eb9581d9f324bd4ad6e93`
- Pixel lane preserved: PR #1325, `fix/focus-mounted-realm-proof-20260926`, head `2f7af37e0e234629d9d8261d19f778205c41f7e5`
- Asset lane: PR #1343, `agent/parallel-aaa-asset-handoff-20260926`
- Active Spatial fallback GLTF changes in PR #1343: none
- Candidate package receipt: `operations/assets/generated-receipts/parallel-aaa-20260926-candidate-pack.json`
- Canonical reference manifest: `urai-tier1/public/assets/urai/spatial/asset-forge-manifest.json`

## Ready Now

| Package | Target Scene | Artifact | Hash / Version | Format | State | Integration Notes | Known Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| home-entry-chamber-v1 | Home / entry chamber | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/home-entry-chamber-v1.candidate.glb` | `0a3c3c2da53c5fe25958e57954c8337d7a27d9c4f94ae0967de21ae84e3e8883` | GLB | REAL ARTIFACT READY | Candidate only; compare against canonical Home architecture before promotion. | Not active fallback; do not replace pixel-owned Home files without visual acceptance. |
| ground-world-terrain-v1 | Ground | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/ground-world-terrain-v1.candidate.glb` | `8068d71509d55035efeb869d827328aa5422a99f6a1f46c80db1424c8f32e1e8` | GLB | REAL ARTIFACT READY | Candidate terrain handoff for Ground review. | Candidate lacks final integrated scene acceptance. |
| life-map-memory-star-v1 | Life Map / Memory Star | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/life-map-memory-star-v1.candidate.glb` | `6fa964e1c51b66f83ccafa7c0c774185bee528dfbb673d8b906bc2dc181f9bcf` | GLB | REAL ARTIFACT READY | Candidate Memory Star package; preserve stellar photosphere canon. | Must be visually checked against Life Map layering. |
| focus-memory-chamber-v1 | Focus | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/focus-memory-chamber-v1.candidate.glb` | `fb88bf90b3757798a0cdbbd158e95c40e8e322524c9da1632be5a0ffef096d90` | GLB | REAL ARTIFACT READY | Candidate Focus chamber support package. | Do not alter Focus pixel lane geometry directly. |
| replay-memory-environment-v1 | Replay | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/replay-memory-environment-v1.candidate.glb` | `51eca3cbf7f28d438fb7e09c868f8247d02eb65bfecb015828ce9edb806fe9f0` | GLB | REAL ARTIFACT READY | Candidate Replay environment support. | Needs scene-integrated visual acceptance. |
| urai-orb-avatar-v1 | Global / Orb | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/urai-orb-avatar-v1.candidate.glb` | `83b252f0de613a60fffb15e07cdf4f02ca81b59aac5d5bfccce7ee716287f77d` | GLB | REAL ARTIFACT READY | Candidate Orb avatar support package. | Must not override living-memory-heart canon without review. |
| portal-ring-master-v1 | Shared / transitions | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/portal-ring-master-v1.candidate.glb` | `578bcc59ac90d7df5193fc67cf94efbd4b663a2035a1cd807d494a294c3af00f` | GLB | REAL ARTIFACT READY | Candidate shared transition ring. | Avoid off-canon sci-fi portal usage; visual review required. |
| passport-status-room-v1 | Passport / status | `urai-tier1/public/assets/urai/generated/candidates/parallel-aaa-20260926/models/passport-status-room-v1.candidate.glb` | `47189faa314c4aa0bea590c70bd18c5e71feed3db41b62818e5d66e08a96e8c3` | GLB | REAL ARTIFACT READY | Candidate Passport/status spatial support. | Needs physical-object canon review before promotion. |
| shared-spatial-material-support-v1 | Shared | `urai-tier1/public/assets/urai/spatial/shared/textures/*.svg` and `urai-tier1/public/assets/urai/spatial/shared/particles/*.svg` | see PR #1343 file hashes | SVG | READY FOR SPATIAL INTEGRATION | Shared material and particle support files only. | Not a model replacement. |
| home-platform-navmesh-v1 | Home / XR | `urai-tier1/public/xr/navmeshes/home-platform-v1.json` | see PR #1343 file hash | JSON | READY FOR SPATIAL INTEGRATION | Navigation support candidate for Home/XR testing. | Requires runtime navigation proof after pixel lane frees Home. |

## Waiting On Dependency

| Package | Dependency | Current State |
| --- | --- | --- |
| final Home asset promotion | PR #1325 / pixel Home ownership | BLOCKED from direct integration; candidate is ready for review only. |
| final Focus asset promotion | PR #1325 / Focus pixel ownership | BLOCKED from direct integration; candidate is ready for review only. |
| real captured-reality reconstruction | private Drive source derivatives under connector transfer limit | BLOCKED on derivative creation or alternate approved ingestion route. |
| native Gaussian splat artifact | real captured-reality ingest | BLOCKED until real capture derivatives are ingestible. |

## Captured Reality Truth State

- Private receipt location: Google Drive, not public GitHub
- Real captured input: found
- Real reconstruction: not created yet
- Synthetic demo represented as real: no
- Public GitHub disclosure of private source filenames, IDs, or family/source details: not authorized in this pass
- Smallest unblock action: create ordered proxy or split derivatives below the connector transfer limit, preserving source linkage in the private Drive receipt.

## Verification Evidence

- `node scripts/check-spatial-asset-forge.mjs`: PASS, 20 assets checked
- `node urai-tier1/scripts/validate-assets.mjs`: PASS, 24 manifest entries, 8 ready assets, 14 explicit fallback assets, 0 blocking ready/fallback failures
- `node scripts/verify-production-sensory-assets.mjs`: PASS, production audio verified
- PR #1343 workflow state at receipt time: 27 queued, 2 pending, 0 failed
