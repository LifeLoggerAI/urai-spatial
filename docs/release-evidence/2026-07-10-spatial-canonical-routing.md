# URAI Spatial Canonical Routing Receipt

Date: 2026-07-10
Repo: LifeLoggerAI/urai-spatial
Package: urai-tier1

## Corrected canonical routing

The release guardian requires Genesis Home ownership for `/` and `/home`, and the canonical Tier One shell for `/spatial`.

| Route | Canonical surface |
| --- | --- |
| `/` | `FinalHomeThreshold` |
| `/home` | `FinalHomeThreshold` |
| `/spatial` | `TierOneExperience` |
| `/spatial/life-map-r3f` | `SpatialLifeMapCanonical` |
| `/spatial/ar-vr` | `UraiQuestEntryWorldV2` |
| `/life-map` | `SpatialLifeMapCanonical` |
| `/xr` | `UraiQuestEntryWorldV2` |

## Reason

The real spatial runtime remains available through the guardian-approved `TierOneExperience` shell at `/spatial`, while public Genesis Home routes stay under the guardian-approved `FinalHomeThreshold` owner required by release gates.
