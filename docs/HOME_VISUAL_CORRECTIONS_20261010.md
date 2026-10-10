# UrAi Home visual corrections — 2026-10-10

Scope: isolated child of visual candidate #1782 at `87affd9f99fa203e65f692fbf2d92d2c195a69ab`. Founder execution directive: open star-filled sky, no canopy/ceiling, bodyless first-person sanctuary, existing journey and accessibility retained. Three actual parallel workers reviewed sky/materials, terrain and verification. No existing worker branch was modified.

## Implemented corrections

- Ground: six coarse retained GLB overlays had independently projected vertices and incompatible triangulation. Decoded source sampling showed terrain grading interpolation errors up to approximately 12cm. The existing complete 90m terrain grid now owns rendered ground; conflicting overlays are suppressed. Governed GLB bytes, all admitted non-ground source meshes, paths, furnishings, ferns, Orb and navigation remain intact. No purchased asset or new dependency. The continuous grid remains 64,800 triangles, as defined by the existing implementation; discarded subdivision was not shipped.
- Camera: drag pitch previously added meters to a distant look target, limiting upward gaze to approximately two degrees. Pitch now changes camera angle; actual extracted component tests verify over60-degree upward gaze, below45-degree downward gaze and unchanged initial framing across desktop, portrait and landscape. Orb attention accounts for actual camera height/distance and immediately releases to user control.
- Sky: star antialias derivatives now wrap the longitude seam, preventing an exaggerated star footprint. Latitude is clamped before asin. Normal star density/colors, static behavior and surface material detail remain intact. Numerical seam footprint changes from467.9255 cells to0.074485 cells, matching ordinary sampling.
- Proof: native-input forward/left/right/sky/detail/Orb-approach capture script records desktop/mobile/reduced-motion PNG hashes, active source hashes, viewport/DPR, WebGL submissions and RAF timing. Ordinary signed-out Home; no private fixture. Existing Home State Proof retains every original assertion and capture, and adds the targeted regressions/art-direction capture for this child branch.

## Executed validation

92 targeted tests passed, zero failures/skips: geometry/camera, sky interaction/sampling, vegetation instancing and visual authority contracts. Source ground tests verify one complete grid, no cutout and unchanged cached source. Shader mutation checks detect both original defects. Home invariant, runtime boundary/authority and static performance/resource audit pass. Runtime TypeScript check passed. Initial optimized static export compiled and generated routes; an invocation from repo root reported ESLint configuration discovery, so the canonical runtime-directory build is repeated separately.

## Unresolved evidence

Chrome launch in this execution environment fails because its required process socket is unavailable; local dev server is not reachable across tool calls. No new runtime screenshot, GPU shader compilation, physical-device frame rate, rendered art quality, or full visual acceptance is claimed. Original founder screenshots were inspected, but their exact build SHA is unknown. Native exact-head screenshot proof is pending and must be inspected before integration/art acceptance.

Original repo audit mentions a memory ceiling and visible ground portals; these historical prescriptions conflict with the founder's current no-canopy/no-ceiling and preserved environmental-travel directive and were not adopted.

Remaining work: inspect native captures, verify the pale-triangle symptom is gone in actual views, review terrain/path contacts and side horizons, refine art only from visible evidence, prove the full existing journey, then seek legitimate independent release acceptance. This implementation is a reviewable partial correction, not AAA+++ completion, certification or production deployment.
