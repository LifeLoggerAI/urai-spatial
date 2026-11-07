# Tracked source and asset inventory - immutable R861 tree

Method: authenticated GitHub recursive Git Tree read of commit `c2bd556129a6357680c581a582373bac25d542fb`, root tree `44e772097b2d54f14bc72f1a58376c0679f0884d`, `truncated:false`. The attached `MANIFEST.json` indexes 18 complete path/metadata shards; each row records path, Git type, mode, Git object SHA and Git-reported blob byte size. This is full **tracked-tree metadata** enumeration, NOT raw payload/entire history certification.

| Item | Objects | Git-reported bytes |
|---|---:|---:|
| All tracked blobs | 9,597 | 387,089,762 |
| Tree/directory entries | 3,284 | n/a |
| Git submodule pointers | 1 | underlying bytes not counted |
| Canonical application `urai-tier1/src/` | 1,511 | 6,477,216 |
| Canonical `urai-tier1/public/` | 1,049 | 130,838,936 |
| Canonical tests `urai-tier1/tests/` | 425 | 2,986,055 |
| Root tests `tests/` | 71 | 455,523 |
| Root scripts `scripts/` | 309 | 2,330,421 |
| Functions `apps/functions/` | 122 | 1,571,934 |
| Root docs/evidence `docs/` | 437 | 111,910,134 |

Extension-based whole-tree classification (includes archived/legacy): 46 `.glb`/`.gltf`; 384 raster WEBP/PNG/JPG; 407 SVG; 71 WAV/Opus/other audio; 683 Markdown; 5,461 TS/JS; 564 files matching test-path/name heuristic. Inline TSX shader materials exist; zero standalone `.glsl`/`.wgsl` path hits. These overlapping type categories MUST NOT be added together. No Git-tracked video extension was found; zipped historical screenshot archives and native media proofs are separate.

Submodule: `urai-tier1/urai-spatial` -> `1a33a332a31da115ec10ee201587ab80ea1c09e6`, URL points to the same upstream repository; nested checkout and submodule object traversal remain unverified. `.gitattributes` contains no LFS filter rule in this read, but that does not independently certify all external binaries.

Retained asset promotion ledger from Aug 1: 213 runtime images (V1 53, V2 80, V3 14, V4 39, V5 27), seven launch-critical promoted models, three ready sensory assets, two candidate sensory assets. Historical source receipts are NOT fresh per-byte replay, rights verification, final rendered art approval or product-live proof.

Drive recovery crosswalk: an independently maintained historical estate workbook includes original 2025 galaxy, sky, ground, Orb, VFX and animated GLB source with selected raw SHA-256 and isolated EGL render receipts. Those original Drive bytes are outside this Git tree and NOT automatically promoted as current runtime assets.

Source: https://github.com/LifeLoggerAI/urai-spatial/blob/c2bd556129a6357680c581a582373bac25d542fb/docs/release-evidence/SPATIAL_ASSET_COMPLETION_LEDGER_2026-08-01.json .
