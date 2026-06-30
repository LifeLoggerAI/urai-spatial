# URAI AAA Asset Manifest — Tier 1 to Tier 5 / v1 to v5

This is the working asset manifest for turning the current URAI Spatial build from a wired launch candidate into the full AAA+++ visual stack.

## Current truth

- The route art layer is already wired through `urai-tier1/src/spatial/assets/launchRouteAssets.ts`.
- The app already references core route assets under `urai-tier1/public/assets/urai`.
- The deterministic generator is `scripts/materialize-urai-graphics-pack.py`.
- The audit script is `scripts/final-asset-receipt.mjs`.
- The current core pack is allowed to be `placeholder-final`: safe launch art that can ship, while bespoke final art replaces the same paths later.

## Result language

| Status | Meaning |
| --- | --- |
| `final` | Custom approved art, production capture, or bespoke visual asset. |
| `placeholder-final` | Safe generated production placeholder. It is wired and can ship, but should be replaced for true AAA final. |
| `missing` | Required file is absent. |
| `needs-device-proof` | Asset can exist in repo, but the experience must still be verified on physical hardware. |
| `future-expansion` | Not required for V1 launch, but required for the full V2-V5 system. |

## V1 — Launchable Genesis

V1 makes URAI open as a real world, not a web page.

| Pack | Paths | Current target |
| --- | --- | --- |
| Genesis Home World | `home/home-threshold-main.webp`, `home/home-threshold-mobile.webp` | wired placeholder-final, replace with bespoke world art |
| Home portals | `home/home-ground-portal.webp`, `home/home-sky-ascent.webp` | wired placeholder-final |
| Orb companion | `ui/orb-idle.webp`, `ui/orb-active.webp`, `ui/orb-listening.webp`, `ui/orb-thinking.webp`, `ui/orb-guiding.webp`, `ui/orb-protecting.webp` | expand state pack |
| Ground world | `ground/ground-world-main.webp`, `ground/ground-reception.webp`, `ground/ground-privacy-sanctuary.webp`, `ground/ground-logistics.webp`, `ground/ground-wellness.webp`, `ground/ground-memory-archive.webp` | wired placeholder-final |
| Life Map galaxy | `life-map/life-map-galaxy-main.webp`, `life-map/life-map-node-*.webp` | wired placeholder-final |
| Focus chamber | `focus/focus-memory-chamber-main.webp` | wired placeholder-final |
| Replay film | `replay/replay-memory-film-main.webp`, `demo/replay-film-storyboard.webp` | route art wired, demo storyboard added as target |
| Mirror realm | `mirror/mirror-reflection-main.webp`, `mirror/mirror-pattern-glyph.webp` | wired placeholder-final |
| Passport vault | `passport/passport-vault-main.webp`, `passport/passport-ownership-seal.webp` | wired placeholder-final |
| Status control room | `status/status-route-matrix-main.webp`, `status/status-health-pill.webp` | wired placeholder-final |
| Open Graph / social | `open-graph/*.webp`, `social/*.webp` | needed for public launch kit |

## V2 — Embodied Life OS

V2 makes the system feel alive and personal.

| Pack | Paths | What it unlocks |
| --- | --- | --- |
| Workforce avatar expansion | `avatars/*.webp` | council/workforce presence in Ground |
| Object state pack | `ground/*`, `ui/*` | hover, inspect, active, locked, protected states |
| Memory-star variants | `life-map/life-map-node-*.webp` | relationship, family, legacy, recovery, work, place, body constellations |
| Onboarding visuals | `social/app-preview-phone.webp`, future onboarding paths | app-like guided first run |

## V3 — Spatial / XR

V3 is the physical “step inside yourself” proof.

| Pack | Paths | Status |
| --- | --- | --- |
| Quest entry visuals | `xr/quest-entry-main.webp`, `xr/webxr-fallback.webp` | generated target |
| Controller/hand/gaze UI | `xr/controller-reticle.webp`, `xr/hand-ray.webp` | generated target |
| Comfort and AR fallback | `xr/comfort-mode.webp`, `xr/ar-tabletop-constellation.webp` | generated target |
| Lightweight models | `xr/models/*.placeholder.gltf` | placeholder only; replace with optimized GLB/GLTF |
| Quest proof | launch receipt screenshots/photos | blocked until physical Quest Browser test |

## V4 — Operations / workforce / platform

V4 makes URAI feel like a system of systems.

| Pack | Paths |
| --- | --- |
| Studio visual pack | `tier4/studio-preview.webp` |
| Admin control room | `tier4/admin-control-room.webp` |
| Analytics insight map | `tier4/analytics-insight-map.webp` |
| Jobs queue | `tier4/jobs-queue.webp` |
| Content/story template | `tier4/content-story-template.webp` |
| Privacy operations | `tier4/privacy-ops.webp` |
| Investor/system map | `tier4/investor-system-map.webp` |

## V5 — Trust / accessibility / global scale

V5 makes URAI trustworthy and world-scale.

| Pack | Paths |
| --- | --- |
| Trust architecture | `tier5/trust-consent-architecture.webp` |
| Reduced motion | `tier5/accessibility-reduced-motion.webp` |
| High contrast | `tier5/accessibility-high-contrast.webp` |
| Captions layer | `tier5/captions-layer.webp` |
| Launch proof matrix | `tier5/launch-proof-matrix.webp` |
| Security boundary | `tier5/security-boundary.webp` |
| Export/delete flow | `tier5/export-delete-flow.webp` |
| Haptics/audio placeholders | `audio/haptic-waveform.webp`, `audio/caption-card.webp` |

## What to run after this patch

From repo root:

```bash
set -e

python3 scripts/materialize-urai-graphics-pack.py
node scripts/final-asset-receipt.mjs

cd urai-tier1
corepack enable || true
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build:static
```

Then deploy the static export using the existing Firebase static config:

```bash
firebase deploy --config firebase.static.json --only hosting --project "${FIREBASE_PROJECT_ID:-urai-4dc1d}"
```

## Hard truth

V1 can be launch-ready with placeholder-final art if build, deploy, routes, mobile, and screenshot proof are green.

True AAA+++ final requires bespoke replacement art for the same paths, plus physical Quest Browser proof for Tier 3.
