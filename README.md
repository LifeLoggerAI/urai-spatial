# URAI Spatial

URAI Spatial is the canonical public URAI application repository.

- Public product: `https://urai.app`
- Canonical repository: `LifeLoggerAI/urai-spatial`
- Runtime root: `urai-tier1`
- Canonical branch: `main`
- Current pre-review lane: the newest open full-vision successor PR against `main`, currently sourced from `repair/current-authority-docs-on-final-candidate-20261001`; re-fetch its live head before any SHA-bound claim
- Production mutation: currently quarantined; the canonical release workflow is verification-only / NO-GO
- Production certification: incomplete until exact-head acceptance, independent approval, governed mutation authority, protected deploy, and post-deploy verification

The canonical experience chain is Home → Ground → Life Map → Focus → Replay, with the broader product surface including Mirror, Passport, Privacy Controls, Location Map, and Status.

## Current status

The retained V1-V5 runtime image estate is complete: **213 ready / 0 missing**. Seven launch-critical models are promoted. The paid V2-V5 asset program records **151 generated / 151 passed / 0 failed** with promotion authorized. These asset facts do not by themselves certify runtime behavior, provider activity, XR/device support, or a production deployment.

No historical PR, CI result, screenshot, visual acceptance, or steward attestation transfers release authority to a successor SHA. The current exact `main` commit must earn its own release evidence.

Current allowed framing:

> URAI Spatial has a complete retained V1-V5 image estate and promoted launch-critical spatial models, while the current coherent-3D Home release remains exact-head CI, visual acceptance, governance, protected production deployment, and live-verification gated.

## Evidence authority

Read these before making release or marketing claims:

- [`STATUS.md`](./STATUS.md) — current release boundary, asset truth, and production close-out rules
- [`EVIDENCE.md`](./EVIDENCE.md) — historical and current command/workflow/deployment evidence ledger
- [`release/route-manifest.json`](./release/route-manifest.json) — machine-readable route authority and critical-route contract
- [`release/ROUTE_AUTHORITY.md`](./release/ROUTE_AUTHORITY.md) — route-classification and release-boundary doctrine
- [`docs/release-evidence/SPATIAL_ASSET_COMPLETION_LEDGER_2026-08-01.json`](./docs/release-evidence/SPATIAL_ASSET_COMPLETION_LEDGER_2026-08-01.json) — retained V1-V5 image/model completion
- [`docs/release-evidence/URAI-SPATIAL-20260730-V2-V5-EXACT-PAID-PROMOTION.json`](./docs/release-evidence/URAI-SPATIAL-20260730-V2-V5-EXACT-PAID-PROMOTION.json) — paid V2-V5 generation/promotion receipt
- [`release/tier-xr-release-matrix.json`](./release/tier-xr-release-matrix.json) — tier/XR release requirements
- [`docs/decisions/`](./docs/decisions/) — runtime and release authority decisions

Historical evidence remains valid for what it proved at its recorded SHA, but it is not current exact-head release authority.

## Version posture

- **V1 — Spatial Foundation:** 53 runtime images ready; route/runtime owners and launch-critical models exist. Final production certification still requires the current release path to complete.
- **V2 — Living World:** 80 runtime images ready / 0 missing; 71 paid generated replacements plus 9 preserved certified sources. Asset promotion is complete; runtime/live proof remains separate.
- **V3 — Relationships and Patterns:** 14 runtime images ready / 0 missing; paid generation passed. Consent/privacy/runtime/live proof remains separate.
- **V4 — Spatial Computing:** 39 runtime images ready / 0 missing; paid generation passed. WebXR/browser and physical-device certification remain separate gates.
- **V5 — Mirror of Becoming:** 27 runtime images ready / 0 missing; paid generation passed. Identity/legacy/provenance/privacy behavior and production deployment remain separately gated.

## Production release boundary

The repository intentionally separates verification from mutation:

- `.github/workflows/spatial-live-deploy.yml` is verification-only and cannot deploy.
- `.github/workflows/spatial-governed-wif-deploy.yml` is the sole governed production mutation workflow. It is manual-only and requires an exact merged PR head with successful exact-head Release Governance Guard, a distinct rollback ancestor, protected-production approval, short-lived Google WIF/OIDC identity, exact post-deploy smoke, and automatic rollback on failed live certification.

Legacy automatic dispatch shims are retired. A preview, verification run, WIF identity proof, green CI subset, or source presence of the governed workflow is not production completion. The governed deploy workflow must not be dispatched without separate explicit deployment authorization.


## Repository authority

Older URAI repositories may support migration, reference, or rollback. The canonical public runtime remains `LifeLoggerAI/urai-spatial/urai-tier1` unless a reviewed decision record changes that authority.
