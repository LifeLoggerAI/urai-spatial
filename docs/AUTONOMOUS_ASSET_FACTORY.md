# URAI Bounded Asset Planning Pilot

This pilot converts the existing typed spatial asset manifest into bounded planning packets for future production work.

## Current authority

The planner is deliberately **plan-only** and **disabled for paid execution** by default. It may inventory and prioritize work without spending money, contacting an external service, or promoting generated assets.

## Pilot flow

1. Read `urai-tier1/src/spatial/assets/assetManifest.ts`.
2. Select `future` or `missing` assets with `critical` or `high` priority.
3. Allocate no more than the configured daily and per-asset USD planning caps.
4. Write provider-neutral planning packets to `urai-tier1/artifacts/asset-factory/jobs/latest-plan.json`.
5. Validate all already-promoted assets with the existing `assets:validate` gate.
6. Retain the plan as a GitHub Actions artifact.

## Required gates before any paid generation

Paid execution must not be enabled until all of the following exist and are independently verified:

- explicit provider adapters and repository secrets;
- commercial-use and provenance receipt capture;
- deterministic technical checks for each asset type;
- visual-review evidence;
- human approval before manifest promotion;
- rollback to the existing deterministic fallback asset;
- a tested hard stop when the daily budget is exhausted.

No paid provider adapter, live external submission path, or production promotion path is implemented or authorized by this pilot.

## Initial planning limits

The checked-in pilot configuration caps planning estimates at $25 per day, $8 per asset, and two concurrent candidates. These values are not authorization to spend; `enabled` remains `false` and `mode` remains `plan-only`.

## Initial planning targets

The manifest currently makes the highest-priority unfinished targets explicit, including Home environment geometry, the shared portal, Ground terrain, Life Map sky and memory stars, and the global Orb avatar. The planner derives its queue from that canonical manifest rather than maintaining a second backlog.