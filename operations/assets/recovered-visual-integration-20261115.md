# Existing asset restoration — 15 November 2026

## Purpose

The current Home and disclosed sample Replay retained the original fern geometry
but rendered it without the original photographed leaf maps. This change restores
that material detail and reuses the previously authored photographic stone path
maps. It also gives Focus and Replay more room on small screens.

Base: Spatial PR #2087, provider commit
`27ba25f812e7e32659fdd31b6c3cae28152b5302`, tree
`d135fe87880e7821d0c369fd5d1b13c07463f8e2`.
The isolated local base has the identical tree at local commit
`d6530c317e95bab1c39e6ca97fdebd558164c5e2`.

## Implemented

- Restore the original local CC0 fern glTF, geometry buffer, diffuse, normal,
  packed material and separate alpha maps. All recovered bytes match the
  historical source receipts; the geometry buffer and all sixteen original
  attribute/index streams match the previously rendered geometry.
- Preserve all 104 Home and 52 sample Replay root placements. Select one of the
  four original plant variants per root rather than copying the source's four
  plant display grid at every root. Home uses at most eight geometry/shadow
  batches; Replay uses four. Home retains its first 24 shadow-casting roots.
- Clone owned texture/material resources, retain the loader cache and geometry,
  explicitly configure color spaces and alpha masking, and dispose only owned
  resources. Home and Replay spatial retries clear both the glTF and separate
  alpha cache before remounting; an executed callback regression checks the
  order and preserves unrelated cache entries.
- Share one photographed stone PBR material across the three existing Home path
  ribbons, preserving their geometry and world-meter UVs. Reuse the earlier
  restrained world-space photographic macro shader from PR #1931 at
  `e804efde81b85b7e6bb3ee47777ec43ffb400707`. The original procedural surface
  shader does not overwrite these photographs. Clear the complete three-texture
  loader tuple when retrying a failed stone load.
- Compact Focus context into a native mobile disclosure while keeping privacy
  visible; retain full desktop context and all existing actions. Refine the
  Replay header and transport spacing, including protected-preview landscape
  bounds and forced-color/reduced-motion styles.
- Update existing proof harness asset identities and add real alpha and stone
  normal HTTP-503/retry cases. Final browser receipts are linked from PR #2088.

## Recovered but not mounted

The exact historical Jacaranda GLB is retained for review at its original public
asset path. Its actual bytes contain nine KTX2/Basis textures and require Basis
and Meshopt decoding; the historical receipt's WebP description is incomplete.
It is a 54,953-triangle LOD0 tree with approximately 23.94 × 19.32 × 18.85 meter
bounds. An actual isolated browser viewer exposed coarse opaque triangular leaf
surfaces. The leaf map transcodes as RGB without cutout alpha, and enabling alpha
testing does not improve the silhouette. Upstream deliberately used opaque,
merged leaf geometry for distant scenery; loss of an original alpha channel is
not established. This exact optimized donor is rejected for close-range
integration until a better leaf geometry/material source is visually verified.
It is not substituted for the current grove here.

The existing HDR environment and stone displacement sources were found and
verified separately but are not added to the runtime. No private Gaussian splat
is copied into public assets or treated as approved scenery.

## Verification

- Local verification used Node 24.22.1 and the repository's pnpm 10.0.0;
  frozen dependency installation completed.
- Runtime TypeScript check passed.
- Next.js production build passed, including all 151 generated static pages.
- Original compact release runner: **221/221 focused contract suites passed**.
- Recovered photographic macro and path/development-boundary checks: **9/9
  passed**. The macro tests are the recovered donor's existing tests.
- Updated failure-harness/truth/mobile contracts: **12/12 passed**; both proof
  scripts parse; whitespace checks pass.
- Replay source/media/retry checks: **31/31 passed**. Both existing private-media
  browser fixture bundles compile with explicit fail-closed art-loader adapters;
  those fixture browser executions remain pending.
- The actual-code vegetation fixture verifies geometry identity, transformed
  canopy clearance, root posture, batch bounds, photo/alpha material bindings and
  resource ownership. Browser image I/O is explicitly replaced in that fixture.

## Approved browser checkpoint

The user explicitly approved the GitHub review branch and protected Vercel
preview after the earlier upload approval blocks. PR #2088 now contains the
restoration. Its first provider commit is
`f755557a71c87a83f36dfc62b1162eb13310381a`, with tree
`9e455fd0faa6a715285eae27895fbe3b52e1d56c`, identical to the local prepared tree.

The isolated Vercel Sandbox verified all 9,553 source blobs against that tree.
TypeScript and the Node 22 production build passed, including 151 static pages.
Actual Chromium 148 with SwiftShader then passed all three original canonical
journeys: desktop with real Ascent, mobile touch with real Ascent, and keyboard
with reduced motion. Each journey returned through the same selected memory to
Home without page errors or failed requests. A continuous desktop recording and
the original screenshots accompany the browser receipts.

Focus passed at 320 × 700, 390 × 844 and 568 × 320: native context disclosure,
visible demo/privacy notices, 48-pixel targets, help, offline notice and the
Replay-to-Focus return with the same memory identity and restored focus.

The first Replay clearance run exposed real defects: the Memory actions summary
overlapped the centered Orb in narrow portrait, and its expanded panel covered
Adam in narrow landscape. The correction in this commit reserves the actual
right-hand footer space and bounds the landscape panel above the transport.
Measured candidate geometry gives a 12-pixel summary/Orb gap at 320 and 390
pixels wide, and a 31-pixel panel/transport gap at 568 × 320. All eleven candidate
profiles passed the original assertions plus playback/seek hit testing. Those
candidate checks injected the exact edited CSS into the prior build; final
acceptance must use the rebuilt commit without injected CSS. Initial failures
remain in the evidence. PR #2088 records the final source, browser receipts and
protected deployment after that rebuild.

These results do not establish visual acceptance or physical-device
performance. The software renderer and its detected quality tier remain
unmodified. The separate public-donor viewer remains asset inspection only.

## Release status

This is an unmerged review candidate. Production HOLD, disabled private-memory
writes, authentication/consent boundaries and existing art-promotion decisions
remain unchanged. A protected preview supports review; AAA visual acceptance
must be judged from the actual experience.

## Final review and handoff

1. Use the same isolated Vercel project
   `prj_pt7oOQLnCFki8vJb4ph9XhIjiLwZ`; keep the test environment private and use
   disclosed synthetic sample data only.
2. Transfer the exact reviewed source and local recovered assets, verify the
   source tree and asset hashes, then build with the matching source identifier.
3. Run the existing canonical journey, Home asset failure/retry harness and
   Replay control-clearance proof. Inspect actual Home/Replay material frames,
   Focus context open/closed, and mobile portrait/landscape expanded controls.
4. Record actual renderer/quality tier. Software-rendered captures are not
   evidence of a high-end GPU profile; do not override capability detection to
   make the proof look better.
5. Keep failures and image hashes, export evidence, and stop owned disposable
   compute. Publish only a protected preview with the existing protections after
   successful verification. Production promotion remains separately gated.
