# UrAi Platform Icon Derivative Specification

Status: deterministic derivative specification. Final exports remain blocked until the approved master geometry is selected and admitted.

## Source authority

Every icon must derive from one approved UrAi orb or compact-mark source. No platform may use a manually redrawn or independently recolored variant. The source record must include source path, source version, geometry identifier, viewBox, color tokens, approval state, and SHA-256.

## Required outputs

| ID | Format | Dimensions | Key constraint |
|---|---|---:|---|
| favicon-16 | PNG | 16 x 16 | Simplified geometry; legible at native size |
| favicon-32 | PNG | 32 x 32 | Transparent background allowed |
| favicon-48 | PNG | 48 x 48 | Browser compatibility |
| favicon-svg | SVG | scalable | No embedded raster or external font dependency |
| apple-touch | PNG | 180 x 180 | Opaque background; no pre-rounded corners |
| pwa-192 | PNG | 192 x 192 | Full icon |
| pwa-512 | PNG | 512 x 512 | Full icon |
| pwa-maskable-192 | PNG | 192 x 192 | Essential geometry inside maskable safe zone |
| pwa-maskable-512 | PNG | 512 x 512 | Essential geometry inside maskable safe zone |
| android-foreground | PNG | 432 x 432 | Adaptive foreground layer |
| android-background | PNG | 432 x 432 | Flat approved background treatment |
| notification | PNG | platform-required | Single-color alpha silhouette only |
| windows-70 | PNG | 70 x 70 | Tile-safe |
| windows-150 | PNG | 150 x 150 | Tile-safe |
| windows-310 | PNG | 310 x 310 | Tile-safe |
| store-apple | PNG | 1024 x 1024 | Opaque; no transparency; no rounded-corner baking |
| store-play | PNG | 512 x 512 | Play policy-safe and mask-aware |
| social-avatar | PNG | 1080 x 1080 | Central mark survives circular crop |
| email-avatar | PNG | 512 x 512 | Central mark survives circular crop |
| github-avatar | PNG | 512 x 512 | Central mark survives circular crop |
| splash-mark | SVG and PNG | scalable plus 1024 x 1024 | No text required at small viewport |
| loading-mark | SVG | scalable | Reduced-motion static equivalent required |

## Safe-zone rules

- Essential geometry remains inside the central 66 percent diameter for maskable exports unless platform testing proves a stricter bound is needed.
- Social, email, and GitHub avatars must survive square, circle, and rounded-square crops.
- Store masters must be inspected at full size and common device-display sizes.
- Small icons may use an approved simplified geometry but must retain lineage to the same master.
- Text lockups are prohibited in notification, favicon-16, and other unreadably small surfaces.

## Color and transparency

- Colors come only from admitted design tokens.
- Monochrome exports must preserve recognizable silhouette and contrast.
- Transparent pixels must be normalized deterministically to avoid hidden RGB drift.
- Opaque store outputs must specify the approved background token.
- Do not rely on color alone to distinguish product state.

## Deterministic build requirements

The derivative generator must:

1. accept one explicit source asset and version;
2. reject unapproved source states;
3. generate all declared outputs without manual editing;
4. use fixed resampling and alpha settings;
5. write a manifest containing dimensions, file size, MIME type, SHA-256, source SHA-256, generator version, optimization method, and approval state;
6. fail on missing outputs, unexpected dimensions, embedded raster data in SVG, invalid alpha, or filename drift;
7. preserve previous admitted outputs for rollback comparison.

## Visual QA

Required proof includes:

- native-size contact sheet;
- light and dark UI backgrounds;
- circular and rounded-square crop simulation;
- maskable crop simulation;
- high-contrast and forced-colors review where applicable;
- monochrome notification review;
- transparency-edge inspection;
- pixel-diff against regenerated output;
- human brand approval.

## Production boundary

No derivative enters application manifests, stores, public profiles, email, or production deployment until the source master, manifest record, visual QA, legal/trademark status, and rollback identity are approved. Issue #999 remains the protected production authority and is not modified by this specification.