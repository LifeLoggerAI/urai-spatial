# URAI Spatial V1-V6 Asset Inventory Completion Plan

## Purpose

This plan closes the last non-code release lane: final V1-V6 assets.

The core product, routing, release gates, and asset switch are treated as complete. This document defines the exact operational path for dropping assets in so V1-V6 turns from `ASSET_SWITCH_READY_FINAL_ASSETS_PENDING` to `V1_V6_ASSETS_ACTIVE`.

## Source of truth

The source registry is:

```text
urai-tier1/src/spatial/assets/uraiAssets.ts
```

The activation gate is:

```bash
node scripts/check-v1-v6-asset-ready.mjs
node scripts/check-v1-v6-asset-ready.mjs --strict
```

The generated evidence file is:

```text
audit/v1-v6/asset-ready-switch-report.json
```

## Completion lanes

### V1 — Home / Ground

Primary surfaces:

- `/assets/urai/home/home-threshold-main.webp`
- `/assets/urai/home/home-threshold-mobile.webp`
- `/assets/urai/home/home-ground-portal.webp`
- `/assets/urai/home/home-sky-ascent.webp`
- `/assets/urai/ground/ground-world-main.webp`
- `/assets/urai/ground/ground-world-mobile.webp`
- `/assets/urai/ground/ground-privacy-sanctuary.webp`
- `/assets/urai/ground/ground-reception.webp`
- `/assets/urai/ground/ground-logistics.webp`
- `/assets/urai/ground/ground-wellness.webp`
- `/assets/urai/ground/ground-memory-archive.webp`

### V2 — Life Map

Primary surfaces:

- `/assets/urai/life-map/life-map-galaxy-main.webp`
- `/assets/urai/life-map/life-map-galaxy-mobile.webp`
- `/assets/urai/life-map/life-map-node-threshold.webp`
- `/assets/urai/life-map/life-map-node-becoming.webp`
- `/assets/urai/life-map/life-map-node-studio.webp`

### V3 — Focus

Primary surfaces:

- `/assets/urai/focus/focus-memory-chamber-main.webp`
- `/assets/urai/focus/focus-memory-chamber-mobile.webp`

### V4 — Replay

Primary surfaces:

- `/assets/urai/replay/replay-memory-film-main.webp`
- `/assets/urai/replay/replay-memory-film-mobile.webp`

### V5 — Mirror

Primary surfaces:

- `/assets/urai/mirror/mirror-reflection-main.webp`
- `/assets/urai/mirror/mirror-reflection-mobile.webp`
- `/assets/urai/mirror/mirror-pattern-glyph.webp`

### V6 — Passport / Privacy / Location / Status / Avatars / UI

Primary surfaces:

- `/assets/urai/passport/passport-vault-main.webp`
- `/assets/urai/passport/passport-vault-mobile.webp`
- `/assets/urai/passport/passport-ownership-seal.webp`
- `/assets/urai/privacy-controls/privacy-controls-main.webp`
- `/assets/urai/privacy-controls/privacy-controls-mobile.webp`
- `/assets/urai/privacy-controls/privacy-model-access.webp`
- `/assets/urai/privacy-controls/privacy-location-precision.webp`
- `/assets/urai/location-map/location-emotional-weather-main.webp`
- `/assets/urai/location-map/location-emotional-weather-mobile.webp`
- `/assets/urai/location-map/location-place-node.webp`
- `/assets/urai/status/status-route-matrix-main.webp`
- `/assets/urai/status/status-route-matrix-mobile.webp`
- `/assets/urai/status/status-health-pill.webp`
- `/assets/urai/avatars/receptionist.webp`
- `/assets/urai/avatars/privacy-steward.webp`
- `/assets/urai/avatars/schedule-steward.webp`
- `/assets/urai/avatars/wellness-guide.webp`
- `/assets/urai/avatars/relationship-liaison.webp`
- `/assets/urai/avatars/logistics-helper.webp`
- `/assets/urai/avatars/archivist.webp`
- `/assets/urai/avatars/operator.webp`
- `/assets/urai/avatars/builder.webp`
- `/assets/urai/avatars/protector.webp`
- `/assets/urai/avatars/mirror.webp`
- `/assets/urai/avatars/guide.webp`
- `/assets/urai/ui/orb-idle.webp`
- `/assets/urai/ui/orb-active.webp`
- `/assets/urai/ui/orb-listening.webp`

## Asset acceptance rules

Each final asset should be:

- WebP unless the registry explicitly expects another format.
- Named exactly as registered.
- Committed under `urai-tier1/public/assets/urai/**`.
- Paired with an existing fallback so the app stays safe if CDN/browser delivery fails.
- Revalidated with the strict gate before V7 begins.

## Commands

After assets land:

```bash
node scripts/check-v1-v6-asset-ready.mjs --strict
pnpm verify:v1-v6:non-assets
pnpm live:check
```

## Exit criteria

V1-V6 asset lane is complete only when the strict gate returns:

```text
V1_V6_ASSETS_ACTIVE
```

At that point, V7 work can begin without reopening V1-V6 route or runtime code.
