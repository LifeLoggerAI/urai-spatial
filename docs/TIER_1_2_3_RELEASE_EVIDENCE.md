# URAI Spatial Tier-One / Tier-Two / Tier-Three Release Evidence

Generated: 20260616T134654Z

## Status

This document records the latest local verification run.

## Canonical production rules

- Tier-One public launch routes must be verified before release.
- Tier-Two routes must be verified as production-safe adjacent routes.
- Tier-Three must remain gated unless real provider wiring, consent handling, tests, build output, deployment output, and live smoke evidence prove otherwise.
- Unsupported XR, AR, VR, Quest, VisionOS, biometric, memory-grounded provider, and real-time asset provider claims must not appear as live production claims.

## Logs

Evidence logs were written to:

`docs/release-evidence/20260616T134654Z`

## Gate results

- source integrity: see `docs/release-evidence/20260616T134654Z/check-source-integrity.log`
- production routes: see `docs/release-evidence/20260616T134654Z/check-production-routes.log`
- spatial copy: see `docs/release-evidence/20260616T134654Z/check-spatial-copy.log`
- lint: see `docs/release-evidence/20260616T134654Z/lint.log`
- typecheck: see `docs/release-evidence/20260616T134654Z/typecheck.log`
- tests: see `docs/release-evidence/20260616T134654Z/test.log`
- build: see `docs/release-evidence/20260616T134654Z/build-urai-tier1.log`

## Deployment

No deployment is claimed by this evidence file unless Firebase deploy output and live smoke logs are present in this same evidence folder.
