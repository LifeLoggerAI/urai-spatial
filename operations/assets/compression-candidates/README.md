# Lossless Meshopt preparation, pending review

These 21 derivatives address missing model compression without changing the
authored geometry, index order, skins, motion, textures, material definitions,
node transforms, licensing or rights. Every original remains at its canonical
path. Prepared binaries belong only in `generated/` in this operations directory,
outside `public/` and the active runtime asset paths. The canonical launch asset
manifest and golden receipts remain byte-identical. No admission or acceptance
state is changed.

The prepared inputs are bound to source commit
`c04c0f5169777b032a1d50361a27bf35b999436a`. The preparation implementation and
tests are bound to commit `710b776005699f4f6ed4593f8c45b3b9f079e874` and their
individual SHA-256 hashes in `lossless-meshopt-v1.json`. This directory's
manifest contains each original/derivative SHA-256 and exact decoded view and
image payload hashes. Binary candidates are delivered in a separate review ZIP;
they are not committed to or served from the consumer application's public tree.

The 21 original GLBs total 30,212,300 bytes. Prepared GLBs total 14,463,608 bytes,
saving 15,748,692 bytes (52.13%). The already-compressed Home entry GLB is skipped
and unchanged. Meshoptimizer 1.0.1 encodes version 0 streams with `ATTRIBUTES`
and `INDICES`, always with filter `NONE`. The exact installed three-stdlib 2.36.1
decoder factory used by Drei's `useGLTF` reproduced all 902 accessor buffer views
byte-for-byte. All 112 embedded PNG payloads stay unchanged. No quantization,
simplification, index/geometry reordering, animation resampling or texture
re-encoding is performed.

The placeholder fallback buffer follows the Khronos
[EXT_meshopt_compression specification](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/README.md).
Because it intentionally contains no uncompressed fallback URI, the extension
is listed in `extensionsRequired`; existing decoder-enabled consumers can load
it, and consumers without Meshopt support must reject it. JSON serialization
retains authored negative zero values as well as other parsed numerical values.

Validation on the frozen Node 22.17.1 dependencies:

```sh
node --test tests/lossless-meshopt-glb.test.mjs
```

The seven tests cover Uint16/Uint32 index order, unusual IEEE float bit patterns,
authored negative zero, animation metadata, untouched PNG bytes, actual
GLTFLoader geometry/animation parsing, deterministic output, corruption and
semantic edit detection, rejected unsafe layouts, and required fallback layout.
They are registered in both tier1 unit runners.

To reproduce the exact preparation manifest, use an isolated checkout of the
preparation commit above with the existing frozen dependencies, then run:

```sh
node scripts/prepare-lossless-meshopt-candidates.mjs c04c0f5169777b032a1d50361a27bf35b999436a
```

The command verifies originals against the declared Git commit and refuses to
replace different previously generated files. To verify the delivered ZIP, first
check its external SHA-256 receipt, extract into an isolated review checkout,
then run the bundled `evidence/verify-full-node-load.mjs` against that repository.
That read-only verifier checks the delivered manifest hashes, repeats all actual
Meshopt decoder comparisons and full-scene GLTFLoader parses, and verifies the
protected originals and receipts again. It uses already-installed native Canvas
to decode real source PNGs through a disclosed Node image adapter; this optional
CPU-only verifier does not add a project dependency.

The full-scene CPU comparison passed all 21: parsed geometry/accessor bytes,
bone inverse matrices, animations, and real decoded texture RGBA pixels match.
It decoded 224 actual images (112 originals and 112 candidates), without blank
or replacement textures. This evidence is not browser ImageBitmap or GPU upload,
rendered material acceptance, visual/human approval, or physical-device budget
certification. All prepared entries retain `promote=false`,
`runtimeAdmitted=false`, `humanAccepted=false`, `visualAccepted=false`, and the
original `pending-final-review` release state.

Next reviews are bound candidate browser material/skin/animation/render QA,
independent source/package review, owner/human visual acceptance, existing
governed asset admission/promotion, physical-device budgets and deployment proof.
The compression release gate remains open until a reviewed derivative is
admitted through that existing authority chain; prepared candidates alone do
not close it.
