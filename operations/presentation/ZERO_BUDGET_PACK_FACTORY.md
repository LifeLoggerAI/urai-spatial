# Zero-Budget Presentation Pack Factory

This directory is the release-safe presentation layer for URAI system identities and launch surfaces.

## Generate everything

```bash
node scripts/check-zero-budget-presentation-pack.mjs
node scripts/generate-zero-budget-presentation-pack.mjs
```

The generator produces 29 systems × 10 surface presets = **290 deterministic SVG templates** plus a SHA-256 manifest. It uses no provider credential, no network provider, no Firebase deployment, and no paid generation.

## What is safe to use immediately

Brand-only/vector surfaces may be used after human visual approval. Any surface that represents the product must replace the template capture slot with a real exact-SHA runtime capture and attach a receipt matching `capture-receipt.schema.json`.

## Surface families

- hero 16:9
- social 1:1
- vertical 9:16
- GitHub repository card
- email/press header
- app-store portrait
- tablet store
- walkthrough frame
- weekly memory scroll
- investor frame

## Accessibility derivatives

Every composition must remain legible under reduced motion, forced colors, large text, and caption-safe layout. Semantic meaning must not depend on color or motion alone.

## Release truth

`LIVE_VERIFIED` requires an exact runtime capture, human approval, and a valid release SHA. Templates are never product evidence. `WORKING_DEMO`, `PROTOTYPE`, `VISION`, and `BRAND_ONLY` must remain explicitly classified.

## Production boundary

This pack does not authorize production deployment, provider activation, paid generation, DNS changes, billing changes, credential changes, or replacement of already accepted runtime assets.
