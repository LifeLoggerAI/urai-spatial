# URAI Spatial final production audit continuation — 2026-06-23

## Purpose

This note continues `FINAL_PRODUCTION_AUDIT.md` and lives under `docs/release-evidence/`, which is already covered by the existing Spatial live deploy workflow path filters.

## Source state

- Production source of truth: `LifeLoggerAI/urai-spatial`, branch `main`.
- The source includes `urai-tier1/src/app/privacy-controls/page.tsx`.
- Privacy Controls source commit: `84c6e28af89100e78643cbd4ad070d868ff3092f`.
- Final audit source commit: `6eb292429aa24af9af0abc56a487d7c191e837b6`.

## Live state

`https://urai.app` still needs a fresh Firebase Hosting release from latest `main`.

Expected state before that deploy:

- `/privacy-controls` can still render the Home fallback.
- `/mirror`, `/passport`, `/location-map`, and `/status` can still show older deployed copy.

## Workflow finding

`.github/workflows/spatial-live-deploy.yml` supports push verification, manual workflow runs, and deploy when the deploy input is explicitly set. The ChatGPT GitHub connector can inspect and edit repo files, but it does not expose a workflow-dispatch action, so a human Cloud Shell run or GitHub Actions manual run is still required for the actual Firebase release.

## Required production refresh

Run from the Spatial workspace:

```bash
cd ~/urai-spatial
git pull origin main
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
pnpm lock:static
pnpm build:static
firebase deploy --config firebase.static.json --only hosting --project urai-4dc1d
URAI_DEPLOY_URL=https://urai.app pnpm smoke:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
```

## Manual GitHub Actions path

1. Open Actions for `LifeLoggerAI/urai-spatial`.
2. Choose `URAI Spatial Live Deploy`.
3. Run the workflow from `main`.
4. Use deploy input `DEPLOY`.
5. Use live URL `https://urai.app`.
6. Confirm the workflow summary and smoke output.

## Final acceptance

After deploy, these routes must be green:

- `/`
- `/home`
- `/ground`
- `/life-map`
- `/focus`
- `/replay`
- `/mirror`
- `/passport`
- `/privacy-controls`
- `/location-map`
- `/status`

The key proof is that `/privacy-controls` renders its own Privacy Controls page instead of the Home fallback.
