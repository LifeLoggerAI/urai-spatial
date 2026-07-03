# URAI Production Evidence

Evidence snapshot: 2026-07-03

## Certification status

**BLOCKED — NOT YET PRODUCTION CERTIFIED**

The canonical runtime and authority are defined, but current-head workflow completion, deployment receipt, rollback proof, and post-deployment custom-domain smoke are not yet available.

## Canonical source

- Repository: `LifeLoggerAI/urai-spatial`
- Application: `urai-tier1`
- Current verified `main` head at this snapshot: `3054fe8afb442b7f96c750ca28329ad1100e0b85`
- Public domain: `https://urai.app`
- Firebase project reference: `urai-4dc1d`

## Authority evidence

- `UrAi` automatic push-to-production path removed in PR #352.
- Merge commit: `5a9b4e65b8e167354baccc648b05d98f8b5860e0`.
- Verified `UrAi/main` workflow is manual only and requires `DEPLOY_LEGACY_URAI`.
- No deployment run was associated with that merge commit.
- `UrAi-Dev` remains blocked from Firebase use until historical production mappings are removed.

## Repository hardening evidence

| Area | Pull request | Merge/result |
| --- | --- | --- |
| Custom-domain slash/query/legacy smoke | `urai-spatial#329` | Merged |
| Proof receipt filtering/deduplication | `urai-spatial#332` | Merged |
| Frozen lockfile verification | `urai-spatial#333` | Merged |
| V2 visible runtime wiring | `urai-spatial#326` | Merged; certification still depends on current head gates |
| Explorable XR entry | `urai-spatial#325` | Merged; physical verification limited to prior receipt boundary |
| XR session/control hardening | `urai-spatial#336` | Merged; device retest pending |
| Asset paid-run/promotion safety | `asset-factory#117` | Merged at `392344dd8c65296d3d060c2a3d8539a6fbc7d1bb` |
| Legacy automatic deployment removal | `UrAi#352` | Merged at `5a9b4e65b8e167354baccc648b05d98f8b5860e0` |

## Current workflow state

The latest inspected XR hardening head `cf34a51f7bb0c2dda835a78f6a3723c521b2686e` triggered 14 required workflows. At inspection time all were queued, including:

- URAI Spatial CI
- Spatial Production Lock
- URAI Spatial Lock
- Release Readiness
- Release certification
- Spatial Verify
- Production Verify
- Final Proof
- Patch Check
- Privacy adoption
- Firebase Preview
- Live Deploy
- Tier 1–5 Launch Pipeline
- Guardian Diagnostics

Queued is not passed. No production decision may treat these workflows as green until their conclusions and relevant artifacts are recorded.

## Live evidence presently available

- `https://urai.app/` responded with the URAI Spatial Home surface during web inspection.
- Slash-form `/mirror/`, `/passport/`, and `/status/` responded with spatial surfaces during web inspection.
- Direct slash/non-slash equivalence was not fully re-proven from the inspection client.
- The hardened custom-domain workflow is the required authoritative parity check.
- The status source now states that routes are implemented while production certification is pending.

## Missing mandatory evidence

- Exact current deployed commit.
- Current deployed version capture and rollback target.
- Green conclusions for all required current-head workflows.
- Deployment receipt for the chosen canonical commit.
- Successful custom-domain smoke after deployment.
- Mobile, accessibility, visual, privacy, security, monitoring, and rollback artifacts tied to that commit.
- Physical Quest verification for the newly merged XR behavior.

## Deployment decision

No production deployment was initiated during this evidence update because the required current-head gates were queued and rollback/deployment evidence was incomplete.
