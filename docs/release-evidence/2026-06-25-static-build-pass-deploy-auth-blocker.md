# URAI Spatial Static Build Pass + Deploy Auth Blocker — 2026-06-25

## Source

This evidence was provided from Cloud Shell after pulling latest `main` through commit `a4410ced781a0d756dac24eec0da77ba9f5d70d9`.

## Commands run

```bash
cd ~/urai-spatial
git pull origin main
pnpm lock:static
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

## Passed

`git pull origin main` fast-forwarded from `f1a6ae8f` to `a4410ced` and pulled the Privacy Controls route-handler removal, expanded live smoke script, and build/smoke fix evidence.

`pnpm lock:static` passed every gate:

- `urai:guardian`
- `check:runtime-boundary`
- `check:source-integrity`
- `check:production-routes`
- `check:spatial-copy`
- `check:launch-boundary-contract`
- `check:tier-xr-release-matrix`
- `tier:check`
- `migration:check`
- `home:invariant`
- `firebase:rules:check`

`pnpm build:static` passed. Next.js 15.5.7 generated static pages successfully:

```text
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (110/110)
✓ Exporting (2/2)
✓ Finalizing page optimization
```

The route table included `/privacy-controls` as a static page after deleting the conflicting route handler.

## Deploy blocker

Firebase Hosting deploy did not complete because the local Firebase credentials are expired:

```text
Authentication Error: Your credentials are no longer valid. Please run firebase login --reauth
For CI servers and headless environments, generate a new token with firebase login:ci
```

Firebase then emitted:

```text
Error: Assertion failed: resolving hosting target of a site with no site name or target name. This should have caused an error earlier
```

Given the preceding authentication errors, this is treated as a Firebase auth/session blocker first, not a source/build blocker.

## Live smoke result

Both production and Firebase web app URLs returned 200 for the expanded route chain:

- `/`
- `/home`
- `/ground`
- `/ascent`
- `/life-map`
- `/focus?memoryId=quiet-reset`
- `/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread`
- `/unwind`
- `/mirror`
- `/passport`
- `/privacy-controls`
- `/location-map`

Both live smoke checks still failed on `/status` because the currently deployed `/status` HTML contains stale launch-copy terms. Current source `urai-tier1/src/app/status/page.tsx` has been inspected and does not contain those stale terms, so this is a deploy freshness issue until Firebase auth is renewed and hosting is redeployed from the passing static build.

## Required next action

Authenticate Firebase, then deploy the already-passing static build.

Interactive Cloud Shell path:

```bash
firebase login --reauth
cd ~/urai-spatial
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

Headless CI path:

```bash
firebase login:ci
# store the generated token securely, then run:
cd ~/urai-spatial
FIREBASE_TOKEN="$FIREBASE_TOKEN" firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

## Readiness update

Spatial source/build is green for this pass. Spatial live remains blocked only by Firebase credential renewal and redeploy evidence.
