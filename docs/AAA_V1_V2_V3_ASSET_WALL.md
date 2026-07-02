# URAI AAA V1/V2/V3 Asset Wall

Generated for the public launch hardening pass after the final green route proof.

## Non-negotiable rule

Do not invent a second visual system.

1. Replace current V1 files under `urai-tier1/public/assets/urai/...` first.
2. Keep existing fallback SVGs and route paths live-safe.
3. Add V2 state packs only for new helper/object/star/Focus/Replay/Mirror/Passport states.
4. Add V3 assets only under the XR tree and do not claim physical XR final until Quest/device proof exists.
5. Every asset must be visible, mobile-safe, fallback-safe, and screenshot-proofed.

## Current proof baseline

The green proof baseline before this asset wall recorded:

- 18 routes checked.
- 18 routes OK.
- 0 fingerprint failures.
- 24 desktop/mobile screenshots captured.
- Quest Browser proof still manual.
- Bespoke final art still cannot be claimed until placeholder-final route art is replaced and visually reviewed.

## V1: public route world final

V1 is complete when the route chain looks finished as a single world:

`/home -> /ground -> /life-map -> /focus -> /replay -> /mirror -> /passport -> /status`

Replace exact existing files first:

- `assets/urai/home/home-threshold-main.webp`
- `assets/urai/home/home-threshold-mobile.webp`
- `assets/urai/home/home-ground-portal.webp`
- `assets/urai/home/home-sky-ascent.webp`
- `assets/urai/ground/ground-world-main.webp`
- `assets/urai/ground/ground-world-mobile.webp`
- `assets/urai/ground/ground-reception.webp`
- `assets/urai/ground/ground-privacy-sanctuary.webp`
- `assets/urai/ground/ground-logistics.webp`
- `assets/urai/ground/ground-wellness.webp`
- `assets/urai/ground/ground-memory-archive.webp`
- `assets/urai/life-map/life-map-galaxy-main.webp`
- `assets/urai/life-map/life-map-galaxy-mobile.webp`
- `assets/urai/focus/focus-memory-chamber-main.webp`
- `assets/urai/focus/focus-memory-chamber-mobile.webp`
- `assets/urai/replay/replay-memory-film-main.webp`
- `assets/urai/replay/replay-memory-film-mobile.webp`
- `assets/urai/mirror/mirror-reflection-main.webp`
- `assets/urai/mirror/mirror-reflection-mobile.webp`
- `assets/urai/passport/passport-vault-main.webp`
- `assets/urai/passport/passport-vault-mobile.webp`
- `assets/urai/privacy-controls/privacy-controls-main.webp`
- `assets/urai/privacy-controls/privacy-controls-mobile.webp`
- `assets/urai/location-map/location-emotional-weather-main.webp`
- `assets/urai/location-map/location-emotional-weather-mobile.webp`
- `assets/urai/status/status-route-matrix-main.webp`
- `assets/urai/status/status-route-matrix-mobile.webp`
- `assets/urai/ui/orb-idle.webp`
- `assets/urai/ui/orb-active.webp`
- `assets/urai/ui/orb-listening.webp`
- `assets/urai/avatars/*.webp`

V1 done means: no dashboard energy, no obvious generated placeholder art, no mobile crop accidents, no route that looks cheaper than the rest.

## V2: living system final

V2 is complete when URAI feels personal and stateful, not just visually routed.

Registry added:

- `urai-tier1/src/spatial/assets/v2Assets.ts`

Required state families:

- Helper states: idle, working, approval, protected, blocked, warning, complete, mobile portrait.
- Ground object states: idle, hover, inspect, active, locked, approval, complete.
- Memory star states: base, hover, selected, Focus-ready, Replay-ready, protected, shared-with-consent, archived, new.
- Focus variants: recovery, relationship, family, legacy, place, body, work, creation, grief, missing-image fallback.
- Replay templates: recovery, relationship, legacy, place, body, work, milestone, grief, daily reset.
- Mirror patterns: body, relationship, place, work, pressure, growth, soft warning.
- Passport states: private, consent requested, granted, revoked, export ready, delete ready, provenance visible, expired.
- Onboarding and accessibility visual modes.

V2 done means: the same user action can have a calm visible state, a protected state, an approval state, and a complete state.

## V3: physical/XR proof final

V3 is complete only when physical device proof exists.

Registry added:

- `urai-tier1/src/spatial/assets/xrAssets.ts`

Required XR families:

- XR entry chamber.
- 3D Home threshold.
- 3D Ground operations room.
- 3D Life Map galaxy and stars.
- 3D Focus chamber.
- 3D Replay film space.
- 3D Orb companion.
- Controller, gaze, and hand input UI.
- Comfort mode and reduced motion.
- AR tabletop constellation.
- Spatial audio and haptics.
- Performance assets: LOD, KTX2, lightmaps, collision meshes, asset weight manifest.
- Accessibility assets.
- Quest screenshots, Quest navigation video, device receipt, performance notes, comfort notes.

V3 done means: users can open URAI on a headset/device, enter Home/Ground/Life Map/Focus/Replay, and the repo contains proof receipts.

## Audit runner

Non-strict report:

```bash
node scripts/audit-v123-asset-wall.mjs
```

Strict gate when the wall should block release:

```bash
node scripts/audit-v123-asset-wall.mjs --strict
```

The script writes:

`docs/receipts/V123_ASSET_WALL_AUDIT.latest.json`

## Production replacement workflow

```bash
cd "$HOME/urai-spatial" || cd "$HOME/urai-work/urai-spatial"
git pull --ff-only origin main

# Replace assets at exact existing paths first.
node scripts/audit-v123-asset-wall.mjs
pnpm typecheck
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project "${FIREBASE_PROJECT_ID:-urai-4dc1d}"
node scripts/aaa-launch-proof.mjs --skip-install --skip-typecheck --skip-test --skip-build --screenshots --base=https://urai.app
```

## Honest publish language

Allowed now:

- Route chain green.
- Final asset spine live.
- Screenshot proof captured.
- V1/V2/V3 asset wall registered.

Not allowed until proven:

- Bespoke final art complete.
- V2 living system complete.
- V3 Quest/XR final.
- Production backend/provider automation complete.
- `uraifoundation.org` DNS/HTTPS complete.
