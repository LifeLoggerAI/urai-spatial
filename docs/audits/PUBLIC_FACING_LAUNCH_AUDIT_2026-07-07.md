# Public-Facing Launch Audit — 2026-07-07

Repository: `LifeLoggerAI/urai-spatial`
Runtime root: `urai-tier1`
Canonical public app: `https://urai.app`

## Executive call

URAI Spatial has a substantial public-facing V1 spatial/demo product spine in source. The current repository supports Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Status, Privacy Controls, Location Map, demo surfaces, and XR preview surfaces.

It is not yet safe to claim broad production certification, V1-V100 completion, provider-active assets, physical XR/Quest certification, autonomous real-world actions, or production backend persistence until exact receipts close those gates.

## What is done

- Canonical source repository exists and is admin-accessible: `LifeLoggerAI/urai-spatial`.
- Runtime root is `urai-tier1`.
- Launch truth source exists at `urai-tier1/src/data/launchTruth.ts`.
- Public Status route imports launch truth and distinguishes implementation from certification.
- Privacy Controls route has a dedicated source owner and fingerprint copy.
- Package scripts exist for route checks, source locks, typecheck/build, static build, live release check, live deploy, smoke, XR verification, and release locks.
- The production workflow exists at `.github/workflows/spatial-live-deploy.yml`.
- The deploy workflow smoke section was repaired in commit `c1f06bda62fffae3b2eb1c9a681f9a7a1ae37287`.
- `STATUS.md` was refreshed in commit `c9c7c31fdf087125277974fb0f1325ebec04939c` to avoid stale production-certification language.

## What remains before green production claim

1. Confirm the latest `main` head after audit patches.
2. Run current-main release verification:
   - `pnpm install --frozen-lockfile`
   - `pnpm live:check`
   - `pnpm verify:e2e:resilient`
   - `pnpm build:static`
3. Run the protected live deploy workflow only after verification passes.
4. Capture exact tested SHA, exact deployed SHA, and rollback SHA.
5. Smoke the custom domain and Firebase hosting URL.
6. Verify route parity for `/privacy-controls` and `/status` specifically.
7. Capture desktop/mobile screenshots for the public route set.
8. Attach workflow artifacts and route evidence before promoting claims.
9. Keep V2/V3/V4/V5/provider/XR/device/backend claims blocked until their receipts exist.

## Current PR/branch posture

- PR #465 starts an in-repo asset factory pipeline, but it is based on `asset-safe-launch-pack`, not `main`.
- PR #463 is a draft V1 paid asset intake layer and is currently non-mergeable; final GLB/HDR assets are still expected to be missing until generated.
- PR #457 contains canonical V1-V5 asset runtime integration, but remains non-mergeable and gated by exact-head CI.
- PR #460 adds launch verification receipt path but remains draft.

Do not merge asset/runtime expansion PRs into production unless they are rebased onto current `main`, exact-head verification passes, and evidence is attached.

## Safe public wording

URAI Spatial is a substantial V1 fallback/demo public spatial experience with public route proof, launch truth, receipt infrastructure, and future provider seams.

## Unsafe public wording

URAI is not yet certified as fully production-complete across V1-V100, provider-active, device-certified, backend-integrated, or externally verified end-to-end.

## Immediate next operator action

Use the repaired `URAI Spatial Live Deploy` workflow as the release authority. First run it as check-only. If it passes and the required secrets/environment are present, run it with `deploy=DEPLOY` and `live_url=https://urai.app`, then attach artifacts and smoke receipts to the P0 issue.
