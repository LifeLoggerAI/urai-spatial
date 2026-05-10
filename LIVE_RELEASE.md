# URAI Spatial Live Release

This document is the live-release path for publishing a polished URAI Spatial build.

## Goal

Publish only after the integrated spatial surface passes source integrity, canon checks, typecheck, production build, browser/E2E lock checks, function tests, replay contract tests, and Firebase deploy preconditions.

## Canonical release commands

Run a full non-deploying release gate:

```bash
pnpm live:check
```

Deploy to the selected Firebase project after the same full gate passes:

```bash
FIREBASE_PROJECT_ID=<project-id> pnpm live:deploy
```

Alias:

```bash
FIREBASE_PROJECT_ID=<project-id> pnpm publish:live
```

## What `pnpm live:check` does

`pnpm live:check` runs `scripts/live-release.mjs --check`, which verifies the expected release files exist and then runs:

```bash
pnpm verify:release:full
```

That expands to:

```bash
pnpm lock:all && pnpm test
```

The lock suite includes static source checks, boundary checks, migration checks, home invariant checks, Firestore Tier-1 boundary checks, typecheck, production build, and E2E lock checks.

## What `pnpm live:deploy` does

`pnpm live:deploy` runs the same full release verification first. It refuses to deploy unless one of these is set:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_PROJECT`
- `GCLOUD_PROJECT`

After the full gate passes, it deploys:

```bash
firebase deploy --project <project-id> --only hosting,firestore:rules,firestore:indexes,functions
```

## Post-deploy smoke

After deploy, run smoke against the live URL:

```bash
HOST=https://<your-live-host> pnpm smoke
```

Do not mark the release live-ready until the live smoke check passes.

## Release posture

Do not claim live AR, WebXR, wearable, biometric, or memory-grounded providers are active unless those providers are connected, consented, deployed, and validated.

If browser E2E is blocked locally by missing OS dependencies, run the gate in CI or a workstation with Playwright dependencies installed:

```bash
pnpm playwright:ensure
pnpm live:check
```

## Ownership boundary

URAI Spatial owns the immersive spatial interface layer only. See `REPO_PURPOSE.md` before adding non-spatial product, website, marketing, jobs, analytics, admin, or staging-mirror work to this repo.
