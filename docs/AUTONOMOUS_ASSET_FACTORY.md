# URAI Bounded Asset Production Pilot

This pilot converts the canonical spatial asset manifest into production job packets for the assets URAI still needs.

## Owner spending authority

On July 29, 2026, the owner authorized a hard **$300 USD total production budget** for launch-critical asset generation.

The authorization is repository-recorded as:

- total budget: $300 USD;
- per-asset ceiling: $50 USD;
- maximum concurrent candidates: 6;
- priorities: critical and high;
- eligible states: future and missing.

This is real spending authority, not a planning estimate. The factory may allocate the full $300 envelope once an approved provider adapter and billing credential are connected.

## Current execution boundary

Budget authorization is active. External charging is temporarily blocked because no image, 3D-model, audio, or video provider adapter is configured in the repository yet.

That technical block must be removed by connecting an approved provider and secret. It is not a requirement to obtain another budget authorization.

## Production flow

1. Read `urai-tier1/src/spatial/assets/assetManifest.ts`.
2. Select `future` or `missing` assets with `critical` or `high` priority.
3. Allocate jobs within the $300 total envelope and $50 per-asset ceiling.
4. Submit candidates through the configured provider adapter.
5. Capture provider cost, commercial-use rights, and provenance receipts.
6. Run deterministic technical checks and visual review.
7. Require human approval before manifest promotion.
8. Preserve rollback to the existing deterministic fallback asset.

## Non-negotiable gates

Paid production must retain:

- commercial-use and provenance receipts;
- deterministic technical validation for each asset type;
- visual-review evidence;
- human approval before manifest promotion;
- rollback to the existing fallback asset;
- a hard stop when cumulative spending reaches $300.

## Initial production targets

The canonical manifest prioritizes unfinished launch-critical assets including Home environment geometry, the shared portal, Ground terrain, Life Map sky and memory stars, and the global Orb avatar. The production queue is derived from that manifest rather than a second backlog.
