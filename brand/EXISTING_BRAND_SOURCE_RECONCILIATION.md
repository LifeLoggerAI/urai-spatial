# Existing Brand Source Reconciliation

Status: evidence-backed reconciliation; no production logo authority changed.

## Existing deterministic source

The repository already contains:

- `urai-tier1/src/brand/urai-brand.registry.ts`
- `urai-tier1/scripts/generate-urai-brand-svgs.mjs`
- `urai-tier1/scripts/qa-urai-brand-svgs.mjs`
- `urai-tier1/src/app/brand-system/page.tsx`

The SVG generator reads the TypeScript registry, requires at least thirteen product records, and emits light and dark SVG exports into `urai-tier1/brand/exports/svg`. This is the strongest discovered deterministic source system and must be preserved as lineage evidence.

## Naming conflict requiring bounded remediation

The existing registry uses `URAI` as the core platform name and ecosystem prefix. The launch authority now requires:

- `UrAi` for the consumer product;
- `RuAi` for the authorized clinician, researcher, and data portal;
- `URAI Labs`, `URAI Foundation`, and `URAI IP Holdings` for organizations.

The existing generator must not be silently rewritten because it may govern broader ecosystem and certified assets. A subsequent implementation PR must add explicit consumer and portal identities or a compatibility layer, retain historical ecosystem identifiers where technically required, and prove no certified V1 route or binary changes unintentionally.

## Existing source strengths

- Deterministic generation rather than manual one-off exports.
- Accessible SVG title and description elements.
- Light and dark modes.
- Product-specific accents and symbol modifiers.
- Stable export directory.

## Gaps before platform derivatives

- No explicit `UrAi` consumer lockup record.
- No explicit `RuAi` portal lockup record.
- Current generator emits fixed `URAI` text in every lockup.
- Current exports are 512 x 640 logo cards rather than a complete favicon, PWA, maskable, notification, store, social-avatar, or email-avatar set.
- No governed clear-space, small-size simplification, maskable safe-zone, or monochrome notification export in the inspected generator.
- No asset hash/provenance manifest is written by the generator itself.
- Final visual approval and legal/trademark review are not evidenced by the source code alone.

## Safe next implementation

1. Add a compatibility-aware public identity registry for `UrAi` and `RuAi` without deleting existing ecosystem keys.
2. Extend deterministic generation to produce source SVG variants only.
3. Add QA for public spelling, accessibility metadata, viewBox, prohibited embedded raster data, and derivative lineage.
4. Generate raster/icon derivatives only after the approved master geometry is selected.
5. Keep all outputs preview-only until visual approval and manifest admission.

## Production boundary

This reconciliation document does not authorize replacing existing marks, changing runtime imports, or publishing any new logo. Protected production issue #999 remains untouched.
