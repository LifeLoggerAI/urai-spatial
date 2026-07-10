# URAI Privacy Location Rules

Status: Release guardian canonical rule
Owner: URAI Labs
Applies to: URAI Spatial, Genesis Home, Ground, Life Map, XR, Replay, Focus, and location-aware surfaces

## Core rule

URAI treats location as sensitive private context.

Location data must be permissioned, minimized, explainable, revocable, and never silently converted into surveillance, diagnosis, advertising targeting, law enforcement, emergency dispatch, or third-party tracking.

## Required privacy modes

URAI Spatial location display modes are:

- symbolic-only
- city-only
- approx-private
- exact-private
- exact-share-opt-in

## Genesis mode restrictions

Do not display exact addresses in Genesis mode.

Do not display raw latitude and longitude in Genesis mode.

Genesis mode may use symbolic-only, city-only, or approx-private context only.

## Exact location rule

Exact location is always private by default.

Exact address, exact latitude, exact longitude, and continuous live tracking must stay hidden unless a future verified feature uses exact-share-opt-in with explicit user consent.

## Required behavior

- Location access requires clear user consent.
- Location-aware features must work in degraded mode when location is unavailable.
- Raw precise location must not be exposed to public UI by default.
- Location context should be reduced to the minimum useful precision.
- Stored location-derived signals must be tied to a clear product purpose.
- Users must be able to revoke location permissions.
- Users must be able to understand why a location-aware surface is being shown.
- Location context must not be used for hidden profiling.
- Location context must not be sold.
- Location context must not be shared with external services except when required to perform a user-requested action.
- Location context must not be used for advertising targeting.

## Spatial rules

Ground, Life Map, Focus, Replay, and XR routes may use location only as contextual world state.

They must not imply real-world surveillance, live tracking, emergency dispatch, diagnosis, or authority action unless the user explicitly enables a future verified feature with separate consent.

## Launch rule

If location permissions, contracts, or retention behavior are incomplete, the feature must stay demo, local, mocked, symbolic-only, city-only, approx-private, or privacy-safe fallback only.

## Evidence rule

Any production release touching location must include route owner, consent behavior, data source, storage behavior, retention behavior, delete/export behavior, fallback behavior, and evidence receipt.
