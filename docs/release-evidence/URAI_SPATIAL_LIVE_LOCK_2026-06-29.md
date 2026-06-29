# URAI Spatial live release evidence - 2026-06-29

## Scope

Repository: `LifeLoggerAI/urai-spatial`
Branch: `main`
Firebase Hosting project observed in deploy logs: `urai-4dc1d`
Hosting URL observed in deploy logs: `https://urai-4dc1d.web.app`

This evidence file records what is verified, what was fixed, and what still requires a final live smoke pass before calling the Spatial release fully done.

## Verified from operator deploy logs

- `xr:verify` completed successfully before deploy.
- XR runtime contract test count: 14.
- XR runtime contract failures: 0.
- Navmesh bake completed for `home-platform-v1`.
- Quest/mobile WebXR validation returned `ok: true`.
- Firebase deploy completed successfully after the SSR/function build issue was resolved.
- Firebase Hosting released a new version for `urai-4dc1d`.
- SSR function `ssrurai4dc1d` updated successfully.

## Repository hardening completed after deploy

- Firebase runtime aligned from `nodejs24` to `nodejs22` for current Firebase Frameworks compatibility.
- `apps/functions/package.json` engine aligned to Node 22.
- Compatibility aliases were added for stale checklist names:
  - `verify:routes`
  - `verify:assets`
  - `check:production-claims`
  - `check:firebase`
  - `check:onboarding`
  - `check:system-registry`
  - `check:production-lock`
  - `smoke:genesis-spine`
- Missing Spatial/XR proof scripts were added:
  - `scripts/check-spatial-assets.mjs`
  - `scripts/smoke-home-xr-live-url.mjs`
  - `scripts/check-home-xr-lock.mjs`
  - `scripts/check-home-xr-proof-manifest.mjs`
  - `scripts/check-home-xr-live-deploy-proof.mjs`

## Required final commands

Run from repo root with Node 22+ and pnpm 10:

```bash
pnpm check:types
pnpm lint
pnpm test:rules
pnpm xr:verify
pnpm verify:assets
pnpm verify:routes
pnpm check:production-claims
pnpm check:firebase
pnpm check:system-registry
pnpm smoke:home-xr:live
URAI_DEPLOY_URL=https://urai-4dc1d.web.app pnpm smoke:live
node scripts/check-home-xr-lock.mjs
node scripts/check-home-xr-proof-manifest.mjs
URAI_DEPLOY_URL=https://urai-4dc1d.web.app node scripts/check-home-xr-live-deploy-proof.mjs
```

## Go/no-go status

Current status: `DEPLOYED BUT FINAL LIVE SMOKE REQUIRED`.

The deploy log proves Firebase Hosting and the SSR function released successfully. The repo now contains the missing verification compatibility layer. However, do not claim the public user surface is fully finished until the final live smoke commands pass against the live URL and the root/public routes no longer present transitional deployment copy.

## Known warnings to track

- Firebase Hosting framework support for Next.js is still presented by Firebase as a preview/best-effort integration.
- Firebase Frameworks currently warns on unsupported Node 24, so this repo is aligned to Node 22 for now.
- Firestore deploy logs reported existing remote indexes not present in the local indexes file. They were not deleted during deploy.
- Some npm config warnings are non-blocking but should be cleaned up later.
