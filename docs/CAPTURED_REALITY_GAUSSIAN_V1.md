# URAI Captured Reality / Gaussian Splat V1

Status: IMPLEMENTED CONTRACT LANE / HARD-OFF / NOT ROUTE-MOUNTED / NOT XR-CERTIFIED

## Objective

Make real personal places as visually faithful as practical while preserving URAI truth, privacy, consent, accessibility, provenance and release-governance rules.

This lane is for **physical captured-place reconstruction**. It is separate from the existing emotional-field "splat" abstraction in `urai-field-reconstruction.ts`.

## Current evidence

URAI already has the core surrounding architecture:

- Lived World entities for places, buildings, rooms, routes, objects, people, memories, events and environments.
- Source provenance classes and transformation chains.
- Confirmed / partial / unknown reconstruction fidelity.
- Fail-closed C3 location consent and C4 sensitive-inference boundaries.
- Replay source-truth grammar.
- Browser 3D runtime based on Three.js / React Three Fiber / Drei.
- Separate XR runtime and feature gating.
- Private real-world capture evidence in Drive, including the Parents' House source package.
- A four-state Replay evidence model: recorded source truth, spatially reconstructable, interpretive and unknown.

The Parents' House source package explicitly identifies photogrammetry / Gaussian-splat / NeRF suitability as pending pixel-level inspection of the original videos. The three originals remain private source authority.

## New source contract

`CapturedRealityAsset` adds a governed bridge between real source evidence and a renderable spatial reconstruction.

Required truths:

1. A Gaussian splat is a **reconstruction derived from recorded evidence**. It is never labeled as the original recording.
2. A source-backed reconstruction must reference real source IDs in the Lived World graph.
3. Generated-only context cannot qualify as source-backed autobiography.
4. Exact/private location requires C3 `location.context` consent.
5. The truth label is mandatory at runtime.
6. Unknown reconstruction fails to a generic non-autobiographical fallback.
7. Interpretive reconstruction remains visibly bounded and cannot enter the photoreal autobiographical splat lane.
8. The whole feature is hard-off unless `URAI_ENABLE_CAPTURED_REALITY=true`.
9. No launch route is changed by this V1 contract.
10. XR remains independently gated and requires real-device privacy, comfort, performance and distribution evidence.

## Canonical processing chain

```text
IMMUTABLE PRIVATE ORIGINALS
  -> analysis derivatives / selected frames
  -> frame quality + privacy screening
  -> camera solve / Structure-from-Motion
  -> Gaussian reconstruction training
  -> reconstruction QA against held-out source views
  -> cleanup / crop / artifact removal
  -> archival interchange derivative
  -> web-runtime .splat derivative
  -> optional GLB collision/depth/fallback mesh
  -> CapturedRealityAsset manifest
  -> Lived World source binding
  -> consent + release decision
  -> Replay / real-place runtime mount
  -> XR only after separate device certification
```

## Recommended toolchain

### Fast private phone capture

A phone-native splat capture application can create an immediate private proof-of-concept. Prefer local/on-device processing for sensitive homes and family spaces when available. Export a lossless/interchange splat derivative for archival and a runtime derivative for URAI.

### Existing ordinary video / photo archives

For existing source video:

1. Extract sharp frames while preserving original timestamps.
2. Reject motion-blurred, duplicate, heavily occluded or privacy-disallowed frames.
3. Solve cameras with a current SfM pipeline such as COLMAP.
4. Train a 3D Gaussian reconstruction with an approved local or governed workstation pipeline.
5. Retain camera poses, source-frame map, training settings and checksums.
6. Review against source frames before promotion.
7. Export a portable archival representation such as 3DGS PLY/SPZ and a web/runtime derivative.

### Web optimization

Keep the archival source separate from the delivery asset. The browser delivery asset should be aggressively optimized only after a full-quality reconstruction exists. Never overwrite the full-quality source with a compressed web derivative.

## Runtime strategy

V1 browser adapter: `@react-three/drei` `Splat` inside the existing React Three Fiber stack.

Why:

- no second scene framework is required for the first browser lane;
- the splat can coexist with the current spatial world;
- the renderer can remain behind URAI's existing consent and feature-gate layer;
- route integration can be reviewed separately from reconstruction creation.

The component introduced by this lane is intentionally not mounted on a public route yet.

## XR strategy

Do not use browser success as XR proof.

Current URAI XR uses a separate Three.js WebGLRenderer path and remains hard-off. A later XR promotion must prove:

- supported physical headset/device;
- real WebXR session entry;
- splat renderer compatibility on that device;
- stable locomotion and recentering;
- performance budget;
- comfort / reduced-motion behavior;
- private-location handling;
- controller/hand fallback;
- memory exit and return continuity;
- no accidental public sharing.

## Collision and interaction

Gaussian splats are visual reconstruction, not automatically safe walkable geometry.

For embodied movement, generate or author a separate low-complexity collision/depth proxy. Keep that proxy independently versioned and source-linked. Do not infer collision safety from splat appearance alone.

## Capture guidance

For new capture:

- keep the scene as static as practical;
- prefer bright, even lighting;
- avoid moving people, moving shadows and avoidable reflections during the geometry pass;
- move slowly enough to prevent motion blur;
- cover surfaces from multiple positions and angles rather than pivoting like a panorama;
- capture transition zones such as doors, halls, gates and corners from both sides;
- preserve the raw capture even after a successful reconstruction;
- capture people/voices only through explicit likeness/voice authority.

For emotionally important places, do separate passes when useful:

1. geometry / place pass;
2. object-detail pass;
3. ambient-audio pass;
4. people/story recording pass.

This prevents the truth and privacy rules for people from contaminating the base place geometry.

## Parents' House source status

Verified Drive source authority exists for three original MP4s recorded September 16, 2026. All three remain private/owner-only.

At the current connector boundary their approximate sizes are:

- source A: 853 MB;
- source B: 455 MB;
- source C: 922 MB.

The connector currently rejects the smallest source at a 256 MiB raw-download limit. Therefore frame extraction and reconstruction training are still blocked by source-byte transfer, not by URAI architecture.

Required external/source-byte action: create immutable analysis derivatives below the transfer limit or place the originals in a reconstruction workstation that can read the full files directly. Do **not** replace the originals.

## Definition of done for a first real private scene

A first private captured-place scene is complete only when:

- immutable source files are checksummed;
- usable frames and camera poses exist;
- reconstruction is trained;
- source-vs-reconstruction review is recorded;
- privacy/third-party review is complete;
- full-quality and web derivatives are retained separately;
- a `CapturedRealityAsset` manifest validates;
- C3 consent is granted;
- browser renderer proof passes;
- no public route is enabled accidentally;
- a generic fallback is proven;
- exact-location suppression is proven after consent revocation;
- performance is measured on desktop and representative mobile hardware;
- XR remains off until separately certified.

## Non-claims

This V1 lane does not claim:

- production-live Gaussian rendering;
- automatic reconstruction from the current private videos;
- physical-headset certification;
- perfect reconstruction of uncaptured areas;
- fabricated people, speech or events;
- live public sharing of private places;
- replacement of URAI Home with a literal scan of a private residence.
