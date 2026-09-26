# Spatial literal pixel audit — 2026-09-26

Candidate: `1b14dcbd9ce3a811e4d117921cbd8a00c7c42e66`.
Scope: 28 images opened and visually inspected from the downloaded exact-head GitHub Actions artifacts listed below, plus the corresponding current source. This is an audit of candidate screenshots, not a live production certification. Animated transitions, audio, haptics, performance, authentic personal data, other biomes and unsampled routes remain unverified by this inspection.

**Overall verdict: reject AAA+++ visual acceptance and launch certification for this evidence set.** Machine checks and metadata cannot override the rendered pixels. The defects below remain open unless a later exact-head artifact demonstrates their resolution.

| Area | Literal observation | Decision and remaining work |
| --- | --- | --- |
| Home tablet portrait, normal and presentation | Open sky and bodyless first-person framing are present. A very large faceted dark brown rock formation dominates the right; ground, hills and foreground furnishings show low-detail geometry/materials. Luminous oval objects and bare rods are visible against the rock. The frame does not establish the required finished inhabited sanctuary or specific real-world place. | Reject AAA pixels. Needs accepted Home architecture, furnishings, terrain/ridge, atmosphere and Orb assets integrated into the actual scene, coherent material/lighting treatment and new device views. No inference of real object identity is supported. |
| Ground desktop idle/after movement | Sparse repeated canopy and understory sit on a largely featureless olive substrate. Foreground lacks convincing material detail; distant ridges appear flat and washed out. Camera is bodyless, open sky is present. | Reject AAA pixels. Needs integrated terrain material/geometry, believable vegetation distribution/variety, ridge/horizon and lighting depth. Canopy loading is not canopy art acceptance. |
| Ground claimed down/up/back views | All three screenshots are byte-for-byte identical, showing the same forward-facing landscape. The requested terrain/sky/back views were never established. | Reject these proof gates. Replace the gestures and require rendered camera orientation, distinct images, and human inspection of the newly revealed surfaces. |
| Ground phone idle/after movement | Both images are byte-for-byte identical. The same sparse landscape fills the frame. | Reject movement proof as well as AAA appearance. Hold the analog touch through actual render frames and verify physical camera translation. |
| Focus selected desktop, tablet, phone, ultrawide and reduced motion | A broad dim oval/globe with a relatively small thin gold irregular ring dominates the scene. The selected memory is not visually legible inside a convincing luminous stellar photosphere. On tablet portrait the envelope clips against viewport edges. | Reject stellar canon/AAA appearance. Requires accepted Memory Star photosphere/corona and contained-memory compositing, then consistent Life Map → Focus morphology and responsive framing. Source names containing “photosphere” or “no-orb” do not resolve this pixel defect. |
| Focus neutral observatory | Large dim circular layers and a small bright dot are present; the central “awaiting a selected star” text is blurred. | Reject AAA finish. Neutral empty-state readability and restrained composition need correction. |
| Focus no-WebGL | Explicit “Spatial view unavailable” and privacy context are readable; navigation remains visible. Fallback star is a soft glow. | Accept the screenshot's honest unavailable-state disclosure only. It does not prove functional fallback navigation or substitute for stellar visual acceptance. |
| Focus transition/Replay arrival/Focus return | Selected demo title is retained and Focus return reproduces the selected composition. The transition still already shows Replay, so it cannot prove the actual stellar-entry motion. | Identity continuity is supported for this demo's screenshots; motion continuity remains unverified. |
| Replay desktop/tablet/phone, narrow and landscape, before/after Begin | Full-bleed mountain-valley imagery is substantially more detailed than Home/Ground and has no visible rectangular screen border. Captions and controls remain visible across inspected dimensions. After Begin the control says “Hold memory”; a still cannot establish actual playback. | Accept full-bleed demo composition only. Reject certification of being inside an authentic memory: source uses a large generated valley plane matte for the demo, and a curved plane for recorded visual media. Need truthful authored/reconstructed environment, actual depth/parallax and entry/return evidence. |

## Evidence artifacts

The artifact names below correspond to local downloaded folders under `evidence/` in the audit workspace. Filenames carry the candidate prefix where authored by their existing capture scripts.

- `github-actions-artifact-10891383391`: Home tablet normal/presentation.
- `github-actions-artifact-10891174304`: Ground desktop idle, movement, down, up, back.
- `github-actions-artifact-10892031804`: Ground phone portrait idle and movement.
- `github-actions-artifact-10891717723`: Focus desktop, phone portrait/landscape, tablet portrait/landscape, ultrawide, reduced motion, neutral, no-WebGL, transition, Replay arrival, Focus restoration.
- `github-actions-artifact-10891098813`: Replay desktop, large desktop, tablet portrait, phone portrait/narrow/landscape and after Begin.

Confirmed duplicate hashes:

- `ground-temperate-desktop-look-down-material-gate.png`
- `ground-temperate-desktop-look-up-sky-gate.png`
- `ground-temperate-desktop-look-back-world-continuity.png`

All share SHA-256 `a60ec522d0a0c1a16576cb718f3ba352a71e5be6cf78277b8908e58ebdde6b34`.

- `ground-temperate-phone-portrait-idle.png`
- `ground-temperate-phone-portrait-after-move.png`

Both share SHA-256 `ca3acf1ef2481110b76a36d1ad398e332a5e62a196ec9a9b023c1086edefffb2`.

## Bounded correction included with this audit

The existing Ground capture issued only one drag movement. `useDragLook` consumes that event to cross its activation threshold and requires a later movement to turn the camera. The capture now uses multi-step gestures and confirms actual rendered orientation. The former instantaneous analog tap is replaced with a held touch. Runtime frame telemetry records camera position, yaw and pitch; evidence rejects missing telemetry, less than 5 cm of translation, incorrectly oriented down/up/back views, and duplicate image hashes. Back now means approximately 180 degrees at eye level, rather than the old unverified 620-pixel request.

These changes improve proof integrity without changing the art, relaxing a gate, directly mutating camera state or fabricating an image. New regression tests reject the unchanged and sideways camera states that the former proof accepted. Existing Ground art-bible and canopy contract tests remain green. Browser recapture and integrated typecheck remain required; this isolated worktree has no built app. **This correction does not close the visual art defects.**

## Asset and verification dependencies still visible

- Home architecture/furnishings, terrain/ridge, atmosphere and Orb require final accepted assets and real scene integration. Exact real objects require identity/provenance, not approximate generated replacements.
- Ground needs terrain surface detail, continuous geometry, canopy/understory composition and a coherent distant landscape. New directional captures must inspect newly visible surfaces and horizon continuity.
- Memory Star and Focus require the same stellar subject across selection, photosphere reveal and return; visibility of the memory must coexist with stellar morphology.
- Replay requires an accepted environment or validated captured reconstruction, source/truth labels, and continuous camera/environment evidence. A generated matte remains demo imagery; it does not prove Gaussian reconstruction, spatial depth or authentic memory.
- Audio, haptics, transition timing, reduced-stimulation behavior, device GPU performance, other Home states/biomes and full launch-route coverage are not certified by these stills.
- Captured-reality provider completion, usable splat files, provenance/consent and actual renderer integration must be established separately. Nothing in these images proves those dependencies complete.
