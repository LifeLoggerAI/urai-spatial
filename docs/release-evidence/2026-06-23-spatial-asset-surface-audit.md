# URAI Spatial launch asset surface audit — 2026-06-23

## Verified source state

`urai-tier1/src/spatial/assets/assetPackage.ts` defines the asset package surface boundary.

Current registered surfaces include:

- `home-sky`
- `ground`
- `orb`
- `avatar-body`
- `lifemap-star`
- `replay-scene`
- `focus-artifact`

## Remaining source gap

The launch route chain now includes additional public production surfaces that are not represented in the asset package surface union:

- Mirror
- Passport
- Privacy Controls
- Location Map
- Status

## Patch attempt result

A direct connector update to `urai-tier1/src/spatial/assets/assetPackage.ts` was attempted to add these surfaces to `SpatialPackageSurface`, but the connector blocked the file replacement. No source claim is made for that attempted patch.

## Acceptance criteria

The asset package boundary should include launch surfaces for:

- `mirror`
- `passport`
- `privacy-controls`
- `location-map`
- `status`

After patching, run:

```bash
cd ~/urai-spatial
pnpm check:types
pnpm lock:static
pnpm build:static
```

## Product impact

This is not blocking the current static public route spine because the routes use procedural and fallback-safe visuals. It is a production-hardening gap for the asset layer and Asset Factory handoff, because generated or reviewed asset packages cannot yet explicitly declare those launch surfaces.
