# URAI Spatial Final Release Operating Pack

## Executive Summary

`LifeLoggerAI/urai-spatial` is a credible release candidate. It is not live-verified. Current decision: `NO-GO`.

This operating pack is the controlling release-management posture for URAI Spatial until a full evidence chain exists for one locked release candidate SHA.

Do not mark `urai-spatial` as live, deployed, production-ready, or production-verified yet.

A valid live-verification claim requires all of the following to reference one locked SHA:
- release gate evidence
- deploy evidence
- live smoke evidence
- `release/LIVE_STATUS.md`

## Locked Release Posture

- Repo: `LifeLoggerAI/urai-spatial`
- Status: credible release candidate
- Live verification: not yet achieved
- Current decision: `NO-GO`
- No implementation, deploy, secret changes, or production config changes are authorized by this document.
- No live-verification claim is valid unless gate, deploy, smoke, and ledger all match one locked SHA.

## Evidence Basis

Primary evidence files:
- `REPO_PURPOSE.md`
- `LIVE_RELEASE.md`
- `scripts/live-release.mjs`
- `firebase.json`
- `.github/workflows/live-release.yml`
- `release/LIVE_STATUS.md`

Current evidence-driven conclusion:
- release path exists
- deploy path exists
- workflow exists
- live ledger is still pending
- therefore live verification is not yet proven

## GitHub Issue Set

P0:
- [#255](https://github.com/LifeLoggerAI/urai-spatial/issues/255) `P0-SPATIAL-001` Record Firebase production target
- [#256](https://github.com/LifeLoggerAI/urai-spatial/issues/256) `P0-SPATIAL-002` Run non-deploying release gate
- [#257](https://github.com/LifeLoggerAI/urai-spatial/issues/257) `P0-SPATIAL-003` Deploy to selected Firebase project
- [#258](https://github.com/LifeLoggerAI/urai-spatial/issues/258) `P0-SPATIAL-004` Smoke public live URL
- [#259](https://github.com/LifeLoggerAI/urai-spatial/issues/259) `P0-SPATIAL-005` Update live status ledger only after proof
- [#260](https://github.com/LifeLoggerAI/urai-spatial/issues/260) `P0-SPATIAL-006` Release Commit Lock

P1:
- [#261](https://github.com/LifeLoggerAI/urai-spatial/issues/261) `P1-SPATIAL-001` Confirm route/API manifest coverage
- [#262](https://github.com/LifeLoggerAI/urai-spatial/issues/262) `P1-SPATIAL-002` Keep provider claims disabled
- [#263](https://github.com/LifeLoggerAI/urai-spatial/issues/263) `P1-SPATIAL-003` Validate Firebase functions build
- [#264](https://github.com/LifeLoggerAI/urai-spatial/issues/264) `P1-SPATIAL-004` Confirm GitHub Actions secrets/vars
- [#265](https://github.com/LifeLoggerAI/urai-spatial/issues/265) `P1-SPATIAL-005` Secrets and public-config verification

## Required Source-of-Truth Controls

- `P0-SPATIAL-006` is mandatory.
- `P1-SPATIAL-005` escalates to P0 immediately if a real committed secret is found.
- Day 3 sprint language is locked as: `Triage and document only verified release-gate failures; no implementation without explicit approval.`
- A `GO` requires preserved artifacts for both the passing release gate and the passing live smoke run.
- Human confirmation is required for production Firebase project ID, intended live URL, release owner, rollback owner, functions scope, deploy scope, and release candidate SHA.

## Go / No-Go Baseline

`GO` only when all are true:
- one exact release candidate SHA is locked
- `pnpm live:check` passes on that SHA
- Firebase deploy completes from that SHA
- live smoke passes against the public URL from that SHA
- `release/LIVE_STATUS.md` records the same SHA and release facts
- at least one preserved artifact exists for the passing release gate
- at least one preserved artifact exists for the passing live smoke run
- no live-verification claim relies on verbal confirmation alone
- no committed secrets are found
- public copy does not overclaim AR/WebXR/wearables/biometrics/memory grounding

Current decision remains: `NO-GO`

## Notes On GitHub Metadata

The issue bodies contain intended milestone, priority, owner role, dependencies, and size. If repository labels or milestones are later created, those issue bodies should be reconciled with actual GitHub metadata.
