# URAI System Audit — 2026-07-03

## Verdict

URAI is not yet ready for an honest broad production launch.

The spatial product exists and major routes are implemented, but production authority is split between `LifeLoggerAI/urai-spatial` and the legacy `LifeLoggerAI/UrAi` repository. Both target Firebase project/site `urai-4dc1d`. The legacy repository currently deploys to the live channel on every `main` push, and live `urai.app` route forms can resolve to different generations of the product.

## Critical verified blockers

1. `/mirror/` and `/passport/` serve the spatial runtime while non-slash variants can serve the legacy app.
2. `/focus?memoryId=quiet-reset` can resolve to the legacy loading/feedback surface instead of the selected-memory chamber.
3. `UrAi` and `urai-spatial` share the same Firebase production target.
4. The latest `urai-spatial/main` commit did not have complete current-main CI/deploy evidence at audit time.
5. PR #326 had multiple failed lock/proof/verify workflows.
6. PR #325 remained pending/queued and does not yet have physical Quest proof for its new locomotion, teleport, portal, and collision behavior.
7. Open production-evidence issues still require authenticated provider, security, monitoring, rollback, and custom-domain proof.
8. Canon documents conflict about whether `UrAi` or `urai-spatial` is the main public runtime authority.

## Safe changes prepared

### `urai-spatial`

- `fix-receipt-latest` @ `bb28afa2aa65868e97e5302ad4f3e96ddea7cd83`
  - Successful proof receipts only.
  - Per-run concurrency and timeout.
  - Paginated evidence.
  - Receipt deduplication.

- `ci-reproducible-installs` @ `64f1fe5fcfe37c74364f532811da91f63f9b73b7`
  - Frozen install in Spatial Production Lock.
  - Narrow frozen-lockfile verification workflow.
  - Lockfile rewrite check.

- `custom-domain-smoke-hardening` @ `7f21bf08a9b45054e163556e5b4591042737337e`
  - Slash/non-slash route parity.
  - Focus/Replay query preservation.
  - Legacy runtime marker rejection.
  - Daily and post-deploy custom-domain smoke.
  - Deduplicated failure issue.

### `asset-factory`

- `automation-safety-hardening` @ `5a46e8752841a9b186d29e32ba16dc813e87cb46`
  - Cancel superseded V1/V2 paid generation.
  - Restrict V1 rounds to 1–3.
  - Replace direct push to `urai-spatial/main` with reviewed promotion PR.
  - Restrict callback bearer delivery to one configured HTTPS origin.

### `UrAi`

- `disable-legacy-prod-latest` @ `6cb7f54b6057358152897083ed95ec12c595b223`
  - Remove deploy-on-main behavior.
  - Require exact manual override acknowledgement.
  - Cancel duplicate legacy deploys.
  - Use reproducible `npm ci` install.
  - Emit explicit shared-target warnings.

## Tracking

- `urai-spatial#250` — live deployment evidence, updated with route/deploy collision findings.
- `urai-spatial#327` — receipt and dependency hardening review.
- `asset-factory#116` — paid forge safety hardening review.
- `UrAi#351` — critical shared-production-target collision.

## Required human actions

1. Merge the legacy deploy guard before further `UrAi/main` changes.
2. Decide and record one sole public runtime/deployment owner.
3. Merge the custom-domain smoke hardening.
4. Reconfigure Hosting/custom-domain behavior so slash and non-slash forms serve the same build and preserve query parameters.
5. Redeploy the canonical runtime and run the hardened smoke against `https://urai.app` with a known live commit SHA.
6. Merge receipt, frozen-lockfile, and asset-factory safety branches after review.
7. Do not merge PR #326 until all failed workflows are repaired and green.
8. Do not claim the new XR world is device-verified until PR #325 passes CI and a physical Quest retest.
9. Attach current-main build, test, deploy, route, accessibility, mobile, visual, provider, security, monitoring, and rollback evidence.

## Claim boundary

No paid provider call, production deploy, destructive change, direct `main` merge, billing change, DNS change, or secret disclosure was performed during this audit.
