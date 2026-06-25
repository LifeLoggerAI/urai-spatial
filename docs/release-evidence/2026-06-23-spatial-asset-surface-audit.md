# URAI Spatial launch asset surface audit — 2026-06-25 update

## Status

The asset surface gap is now closed in source.

## Completed commits

- `80e5e992d797bf1335a32d0e25b6bf1e55b407f7` expanded `SpatialPackageSurface` to include `mirror`, `passport`, `privacy-controls`, `location-map`, and `status`.
- `4d80fbd426705039c2baf0ea9c2cd3ace9a98970` added route asset sets for the new launch surfaces.
- `58179f2d90400ba92980df7c83eeb3a018f6d338` wired safe fallbacks for the new route surfaces.
- `b95da484be46d5c51d31beafacf6e99147c17e18`, `11854bbc1553e8c859da27b23edd3b3d45b55827`, `576e81ecb3a4180ecc8a1039806df9385cdb1533`, and `b984dcbcbb956bdf20c48b0b34567ef7e89f2eb9` added dedicated Location Map and Status fallback art.
- `eae1d971734869b8e3642c2eecc96143aee79bc1` added `launchRouteAssets.ts`, a compact registry mapping the launch route chain to `.webp` targets and committed SVG fallbacks.

## Covered launch surfaces

- Home
- Ground
- Life Map
- Focus
- Replay
- Mirror
- Passport
- Privacy Controls
- Location Map
- Status

## Remaining art task

The repo is now fallback-safe. Final bespoke `.webp` artwork is still required for the newer surfaces before calling the asset layer final-art-complete.

## Required verification

```bash
cd ~/urai-spatial
git pull origin main
pnpm lock:static
pnpm build:static
```
