# DigitalOcean Provider Integration Receipt — 2026-09-29

Status: source and CI verified; live DigitalOcean inference execution remains blocked on creation/storage of a scoped model access key and subsequent governed deployment.

## Canonical authority

- Repository: LifeLoggerAI/urai-spatial
- Base main SHA at branch creation: c731524c67ced3f677cfd19d60552a0220c0a3ad
- Integration branch: codex/digitalocean-provider-20260929
- Integration head: d51131f9b273078da27fcf2d50350d80014f0b01
- Pull request: #1451

## Implemented

- Server-side DigitalOcean Serverless Inference adapter.
- Synthetic-only authenticated provider canary.
- Secret binding name: DIGITALOCEAN_MODEL_ACCESS_KEY.
- Feature flag: URAI_ENABLE_DIGITALOCEAN.
- Default canary model: openai-gpt-oss-20b.
- Same-origin route: /api/urai/providers/canary.
- Firebase production and preview rewrites.
- Saved-consent and revoked-token auth checks.
- Durable per-user throttling.
- 10-second upstream timeout and cancellation propagation.
- Normalized auth, rate-limit, network, timeout, malformed-response, and canary-mismatch failures.
- Aggregate provider telemetry without prompt or output storage.
- Synthetic-only data-class enforcement.
- No normal Orb or product route depends on DigitalOcean.

## CI proof

GitHub Actions run 36561305009 (URAI Spatial CI) completed successfully at integration head.

Successful jobs included:
- Tier 1 typecheck build and tests
- Functions build and tests
- Firebase config smoke
- Verification lock preflight
- Workspace install and preflight
- LifeMap targeted fast gate
- Spatial camera navigation and ESC lock

Additional exact-head workflows observed successful include canonical production release verification, Spatial Verify, Spatial Release Readiness, v60 CI, privacy adoption, maps bootstrap, patch check, automated receipt ledger, and XR static diagnostics.

## Current DigitalOcean account readback

At the latest API read:
- month-to-date usage: $0.00
- account prepayment balance represented by API account balance: -$5.00
- active Droplets: 0
- SSH keys: 0

No persistent DigitalOcean compute resource was created by this integration branch.

## Live runtime boundary

Current public deploy-proof remains on SHA 748e50398d85effeaa4ed17aaf78d4076dddbb45, not this integration head. The public Status surface still reports production certification unresolved.

Therefore:
- source integration: TEST VERIFIED
- branch CI: TEST VERIFIED
- DigitalOcean inference request: BLOCKED pending scoped model access key
- provider canary deployment: BLOCKED pending credential and merge/deploy authority
- live application E2E: BLOCKED
- fallback/live failure proof: BLOCKED until deployed canary is available

## Credential rule

Create exactly one model access key scoped only to openai-gpt-oss-20b, store the one-time secret directly in Google Secret Manager / Firebase Functions secrets as DIGITALOCEAN_MODEL_ACCESS_KEY, and never expose the value in chat, source, logs, screenshots, or receipts.

Keep URAI_ENABLE_DIGITALOCEAN=false until that secret binding and deployment are confirmed.

## Spend boundary

Keep DigitalOcean auto-reload OFF. Do not create persistent Droplets or GPU deployments for this lane. The synthetic canary is bounded to 32 completion tokens and is intended to consume only negligible prepaid inference usage.
