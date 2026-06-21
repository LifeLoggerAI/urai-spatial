# URAI Spatial Main Surface Polish Evidence

Date: 2026-06-21
Branch: main

## Canon checked

- `TIER1_LOCK.md`
- `VERIFY_TIERS.md`
- `URAI_SPATIAL_RELEASE_LOCK.md`
- `URAI_SPATIAL_MASTER_BLUEPRINT.md`
- `LIVE_RELEASE.md`
- `DEPLOYMENT.md`

Key constraints followed:

- Primary routes stay on the true 3D Genesis/TierOne route contract.
- Stars are doorways, not dead-end cards.
- Every scene needs an exit path.
- Every data-driven visual needs a fallback.
- No debug/demo language should ship in Genesis mode.
- No AR/XR/provider claims are asserted as live without validation.

## Routes in scope

- `/`
- `/home`
- `/spatial`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/status`
- `/privacy-controls`

## Work completed in this pass

- Added production route controls through `LaunchRoutePanel`.
- Wired root/home/life-map/focus route panels.
- Added visible audit actions for Home -> Life Map, Life Map -> Focus, and Focus -> Replay.
- Disabled hidden SEO fallback links after runtime hydration.
- Added GitHub Actions live visual audit with screenshots/artifacts.
- Added route interaction blocker record from live audit.
- Added auto Firebase static deploy workflow path for push events when repo secrets exist.

## Latest GitHub Actions audit evidence provided from run UI

- Routes audited: 11.
- Screenshots expected: 11.
- Old demo copy routes: none.
- Production copy routes: `/`, `/home`, `/spatial`, `/life-map`, `/life-map?star=blue-fog`, `/focus?memoryId=quiet-reset`, `/replay?manifestId=replay-recovery-thread`, `/mirror`, `/passport`, `/status`, `/privacy-controls`.
- Failed interactions before the later interaction fixes: 2.
  - `home-to-life-map`: invisible link selected by the audit.
  - `focus-to-replay`: invisible link selected by the audit.

## Follow-up fixes already pushed after that failing audit

- `Expose visible audit route actions`.
- `Add visible focus replay route panel`.
- `Disable hidden fallback links after hydration`.
- `Auto deploy static production surface on push`.
- `Document live audit interaction blockers`.
- `Trigger live visual audit after interaction fixes`.

## Remaining live edge risk

External no-JavaScript/web extraction still observed stale fallback copy on `https://urai.app/`, `https://urai.app/home`, and old Blue Fog fallback on `https://urai.app/life-map` after the code patches. This indicates the public edge may not have the latest static build until Firebase Hosting deploy completes.

## Required deploy condition

The repo auto-deploy workflow can deploy when these GitHub secrets are present:

- `FIREBASE_TOKEN`
- `FIREBASE_PROJECT_ID`

If the workflow is not visible or secrets are absent, deploy from an authenticated Firebase shell:

```bash
cd "$HOME/urai-spatial"
git fetch origin main
git checkout main
git reset --hard origin/main
rm -rf urai-tier1/.next urai-tier1/out .next out || true
URAI_MIN_INSTALL_FREE_MB=256 URAI_FIREBASE_STATIC_EXPORT=true pnpm build:static
firebase use urai-4dc1d
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
```

## Status

Repo-side polish and audit hardening are substantially complete. Final live status depends on Firebase deploy confirmation and a fresh visual audit on the latest main commit.
