# URAI Spatial Master Blueprint

Status: Guardian-required launch blueprint
Owner: URAI Labs
Package: urai-tier1

## Canonical route authority

| Route | Canonical owner |
| --- | --- |
| `/` | `FinalHomeThreshold` |
| `/home` | `FinalHomeThreshold` |
| `/spatial` | `TierOneExperience` |
| `/spatial-fallback` | 2.5D fallback surface |
| `/spatial/life-map-r3f` | React Three Fiber Life Map |
| `/spatial/ar-vr` | XR entry chamber |
| `/life-map` | Life Map surface |
| `/focus` | Memory focus journey |
| `/replay` | Cinematic replay surface |
| `/xr` | XR entry surface |

## MemoryPlace contract

MemoryPlace includes locationPrivacy.

Allowed locationPrivacy modes:

- symbolic-only
- city-only
- approx-private
- exact-private
- exact-share-opt-in

The exact-share-opt-in mode is the only mode that may expose exact location after explicit user consent.

## Product intent

URAI Spatial is the embodied Life OS runtime.

The world model is:

- Ground: real-life context and place-aware world state
- Life Map: memory constellation and personal meaning graph
- Focus: single-memory or single-session immersion
- Replay: cinematic memory playback
- XR: AR, VR, and headset-ready entry chamber
- Guardian shell: launch-safe routing, privacy, fallback, and release control

## Privacy rule

Location, memory, identity, and replay data are sensitive private context.

Any feature using those signals must be consented, minimized, explainable, revocable, and safe to degrade when data is unavailable.

## Asset rule

If final GLTF, cinematic, avatar, terrain, portal, sky, orb, or particle assets are missing, the runtime must use safe fallback geometry or non-blocking degraded visual evidence instead of crashing production.

## Evidence rule

Any production release must preserve build evidence, route evidence, privacy evidence, and release receipts.
