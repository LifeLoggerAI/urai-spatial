# URAI Deploy Readiness

This document defines the minimum verification required before URAI Spatial can be called live-deployed and working.

## Current rule

```text
Committed is not the same as verified.
CI configured is not the same as passed.
Deploy command existing is not the same as live deployed.
```

## Required local or CI checks

Before staging deploy:

```bash
pnpm urai:guardian
pnpm check:types
pnpm build
pnpm release:p1
```

Before production deploy:

```bash
pnpm verify:release
pnpm live:check
```

If XR/static hosting is part of the release:

```bash
pnpm xr:verify
pnpm build:static
```

## Required GitHub Actions checks

The workflow `.github/workflows/urai-spatial-verify.yml` must pass on the target commit.

Required workflow steps:

```text
URAI Guardian
Check public copy
Check Firestore boundaries
Typecheck
Unit tests
Build
Release gate
```

## Required route smoke coverage

The guardian suite must cover the following routes statically:

```text
/
/spatial
/spatial-fallback
/focus
/location-map
/place/[placeId]
/place/[placeId]/replay
/passport
/council
/legacy
/dream
/ground
```

## Required deploy checks

Staging deploy command:

```bash
pnpm deploy:staging
```

Production deploy command:

```bash
pnpm deploy:prod
```

After deploy, verify:

```text
Home route loads true 3D experience.
/spatial loads true 3D experience.
/spatial-fallback loads fallback shell.
/focus?manifestId=<demo-star> shows Enter Place.
/place/<demo-place-id> loads MemoryPlaceScene.
/place/<demo-place-id>/replay loads PlaceReplayScene.
/location-map loads place atlas.
/passport loads PassportRealm.
/council loads CouncilRealm.
```

## Known verification boundary

A commit is not live verified until one of the following is true:

```text
GitHub Actions reports success for the target commit.
A local terminal run reports all required checks passing.
A deployment run reports success and the deployed URL is smoke-tested.
```

## Canon guardrails

The guardian suite must catch:

```text
2.5D shell promoted back to canonical route
missing fallback route
missing privacy/location rules
debug/demo copy in Genesis-facing source
missing Enter Place focus flow
missing place routes
missing safety gates
routes bypassing repository layer
missing replay/explanation/export contracts
missing place layer/timeline/connection contracts
missing Passport/Council/runtime contracts
missing accessibility/cue contracts
missing live-data validators
recursive release scripts
```

## Current deployment status language

Use this wording until CI/deploy has passed:

```text
Implemented and committed. Awaiting CI/deploy verification.
```

Only use this wording after checks and deployment pass:

```text
Live deployed and verified on <environment> at <commit>.
```
