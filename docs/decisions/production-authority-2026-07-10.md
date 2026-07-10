# URAI production authority decision

Date: 2026-07-10
Status: Proposed for merge

## Decision

`LifeLoggerAI/urai-spatial` is the only production authority for `https://urai.app`.

The production application root is `urai-tier1` on branch `main`.

The Firebase production project is `urai-4dc1d`.

The only authorized production release workflow is:

- `.github/workflows/spatial-live-deploy.yml`
- workflow name: `URAI Canonical Production Release`
- manual deployment only
- exact 40-character release SHA required
- exact rollback SHA required
- protected `production` environment required
- service-account JSON required
- legacy Firebase token authentication prohibited

## Why

The repository runtime boundary, workspace, Firebase configuration, route implementation, release scripts, and current Spatial product work all identify `urai-spatial/urai-tier1` as the intended canonical runtime.

`LifeLoggerAI/UrAi` remains a legacy implementation and feature-extraction source. It must not publish to the shared production Firebase target.

## Release contract

A production deployment is valid only when all of the following are true:

1. The release SHA is the exact checked-out `main` commit.
2. The rollback SHA is recorded and is an ancestor of the release SHA.
3. `pnpm install --frozen-lockfile` succeeds.
4. `pnpm live:check` succeeds for that exact SHA.
5. The Firebase project equals `urai-4dc1d`.
6. Authentication uses `FIREBASE_SERVICE_ACCOUNT_JSON` through a temporary credential file.
7. `pnpm live:deploy` builds static output containing the release SHA, deploys Hosting, and runs post-deploy smoke checks.
8. Verification and deployment receipts are retained as workflow artifacts.

## Disabled competing paths

This change removes the following duplicate or malformed workflows:

- `.github/workflows/urai-spatial-deploy.yml`
- `.github/workflows/spatial-live-deploy-v2.yml`
- `.github/workflows/spatial-live-manual.yml`

The remaining workflow is the sole release entry point.

## Follow-up gates before public beta

This authority decision does not itself certify launch readiness. The final release still requires exact-head CI, route parity, privacy and tenancy proof, mobile and desktop visual QA, live smoke receipts, monitoring, and rollback execution evidence.
