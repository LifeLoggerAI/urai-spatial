# URAI Spatial Canonical Routing Receipt

Date: 2026-07-10
Repo: LifeLoggerAI/urai-spatial
Package: urai-tier1

## Canonical routing change

The public app routes now point at the real spatial runtime instead of weaker shell/demo surfaces.

| Route | Canonical surface |
| --- | --- |
| `/` | `SpatialWorldCanvas mode="spatial"` |
| `/home` | `SpatialWorldCanvas mode="spatial"` |
| `/life-map` | `SpatialLifeMapCanonical` |
| `/xr` | `UraiQuestEntryWorldV2` |

## Reason

The route audit showed the real Tier1 spatial runtime lives under:

- `/spatial`
- `/spatial/life-map-r3f`
- `/spatial/ar-vr`
- `/world`
- `/ascent`
- `/focus`
- `/replay`

This commit makes the main public paths enter those canonical runtime surfaces directly.
