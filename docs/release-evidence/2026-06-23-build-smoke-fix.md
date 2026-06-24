# URAI Spatial build and smoke continuation fix — 2026-06-23

## Trigger

Cloud Shell verification after pulling the final audit commits exposed two concrete release blockers:

1. `pnpm build:static` failed because `/privacy-controls` had both `page.tsx` and `route.ts` resolving to the same route.
2. `pnpm smoke:live` reached the live surfaces but failed on `/status` because the deployed status page still contained blocked stale launch copy. Current source `urai-tier1/src/app/status/page.tsx` does not contain that stale copy, so this remains a deploy freshness problem once the static build succeeds.

## Patches landed

### Remove duplicate Privacy Controls route handler

Commit: `372f07aae03d9a790a4f1ddcdc66ef9826b1d4a5`

Removed `urai-tier1/src/app/privacy-controls/route.ts` so the richer `urai-tier1/src/app/privacy-controls/page.tsx` is the single production source for `/privacy-controls`.

Expected effect: `pnpm build:static` should no longer fail with the Next.js parallel route error for `/privacy-controls/page` and `/privacy-controls/route`.

### Expand live smoke coverage

Commit: `9fd12cdf9ae95c80e9524812c88aa872d50f27ce`

Updated `scripts/urai-live-smoke.mjs` so the live smoke includes the full required launch route chain:

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
- `/status`

## Remaining verification command

Run from Cloud Shell after pulling latest `main`:

```bash
cd ~/urai-spatial
git pull origin main
pnpm lock:static
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

## Expected final behavior

- Build should pass now that `/privacy-controls` no longer has both a page and route handler.
- Deploy should create `urai-tier1/out` and publish the richer `/privacy-controls` page.
- `/status` smoke should pass after deployment because current source does not include the stale live copy detected before the failed deploy.
