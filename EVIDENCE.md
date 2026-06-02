# URAI Spatial Release Evidence

This file is the evidence ledger for URAI Spatial. Do not mark the repository production-live from assumptions, README claims, or local memory. Record command output, deploy references, dates, commit SHAs, and live smoke results here.

## Current status

- Evidence status: automation wiring recorded; live release evidence in progress.
- Runtime app root: `urai-tier1`.
- Current release mode: `fallback-demo`.
- Production-live status: not verified.
- Deployment automation: `.github/workflows/spatial-live-deploy.yml` verifies `pnpm live:check` on configured `main` push paths with `pnpm install --frozen-lockfile` and can deploy only after verification when manually dispatched with `deploy=DEPLOY` or when repo variable `URAI_SPATIAL_AUTO_DEPLOY=true` is configured.
- Automation trigger scope: `urai-tier1/**`, `apps/functions/**`, `packages/**`, `scripts/**`, `tests/**`, Firebase config/rules files, root package/lock/workspace files, `.nvmrc`, `.node-version`, `README.md`, release/deployment/status/evidence docs, `docs/decisions/**`, all workflow files under `.github/workflows/**`, and the workflow file itself.
- Automation trigger coverage: README, portable Node runtime pin, and decision-record coverage added in commit `878d66b5eba02c3aefb45715d717f473312044ff`. Full workflow guardrail coverage added in commit `42ccdf1a8b39200cd69d2650e72f768031f30093` so release-check changes in any workflow can trigger `pnpm live:check`. Frozen-lockfile verification hardening added in commit `d1c256d26807dc3260dc3683dd30e6b8fb8e2247`.
- Latest release-gate observation: workflow run `26812805807` for commit `b5922c6d428c7cb80e1954e6032678152a70652e` triggered successfully and uploaded artifact `7354762010`, but failed in `pnpm live:check` because `urai-tier1/src/app/page.tsx` still routed home through `UraiV1Experience` instead of `TierOneExperience mode="home"`. Commits `2844163dffeec8ad83cacdc6f5805e5f4412be91` and `e9c7ad3d3af231b55049d0de1e4f593410815095` route `/` and `/home` through `TierOneExperience mode="home"`. Commit `d1c256d26807dc3260dc3683dd30e6b8fb8e2247` also retriggers the gate after switching CI installs to `--frozen-lockfile`; the connector/web listing has not exposed a newer run id yet.

## Local verification

Record the exact command, date/time, commit SHA, operator, and result.

| Gate | Command | Result | Evidence / notes |
| --- | --- | --- | --- |
| Install | `pnpm install` | Not recorded |  |
| Spatial invariant | `pnpm check:spatial` | Not recorded |  |
| Typecheck | `pnpm typecheck` | Not recorded |  |
| Build | `pnpm build` | Not recorded |  |
| Local dev server | `pnpm dev` | Not recorded |  |
| Local smoke | `HOST=http://127.0.0.1:3000 pnpm smoke` | Not recorded |  |
| Playwright setup | `pnpm playwright:ensure` | Not recorded |  |
| E2E lock | `pnpm test:e2e` | Not recorded |  |
| Launch gate | `pnpm launch:check` | Not recorded |  |

## Release verification

| Gate | Command | Result | Evidence / notes |
| --- | --- | --- | --- |
| Full release check | `pnpm live:check` | Failed on live gate; rerun pending | Run `26812240951` failed in runtime boundary check because `.github/workflows/urai-production-verify.yml` used npm in a pnpm workspace; fixed by commit `5dd9613aa64883b1a3f04bff766d2b9e0c4b3c36`. Run `26812477972` then failed home invariant guards for camera reset, mode guidance, and replay keyboard silence; fixed by commit `6f940e8c7379f13551a22ffb19bfac816ef00f9e`. Run `26812656154` then failed narrator silent-home guards; fixed by commit `b5922c6d428c7cb80e1954e6032678152a70652e`. Run `26812805807` then failed root route authority for `TierOneExperience mode="home"`; fixed by commits `2844163dffeec8ad83cacdc6f5805e5f4412be91` and `e9c7ad3d3af231b55049d0de1e4f593410815095`. Commit `d1c256d26807dc3260dc3683dd30e6b8fb8e2247` retriggers the workflow with frozen lockfile installs. |
| Full release deploy dry gate | `pnpm verify:release:full` | Failed on live gate; rerun pending | Same blocker chain as `pnpm live:check`; deploy job has been skipped while verification fails, as expected. |
| Replay contract | `pnpm test:replay-tier5` | Not recorded |  |
| Firestore boundary check | `pnpm firebase:rules:check` | Not recorded |  |
| XR verification | `pnpm xr:verify` | Not recorded | Required only before XR/WebXR provider claims. |

## Deployment evidence

| Field | Value |
| --- | --- |
| Firebase project ID | Not recorded |
| Hosting/App Hosting target | Not recorded |
| Live URL | Not recorded |
| Deploy command | Not recorded |
| Deploy commit SHA | Not recorded |
| Deploy date/time | Not recorded |
| Operator | Not recorded |
| Rollback reference | Not recorded |
| Automation workflow | `.github/workflows/spatial-live-deploy.yml` |
| Auto-deploy switch | Repo variable `URAI_SPATIAL_AUTO_DEPLOY=true` required for push-triggered deploy |
| Live smoke URL switch | Repo variable `URAI_SPATIAL_LIVE_URL` or manual workflow input `live_url` |

## Live smoke evidence

Record the result of:

```bash
HOST=https://<live-host> pnpm smoke
```

| Route / API | Expected | Result | Notes |
| --- | --- | --- | --- |
| `/` | Renders | Not recorded |  |
| `/home` | Renders | Not recorded |  |
| `/spatial` | Renders | Not recorded |  |
| `/life-map` | Renders | Not recorded |  |
| `/demo/life-map` | Renders | Not recorded |  |
| `/privacy` | Renders | Not recorded |  |
| `/terms` | Renders | Not recorded |  |
| `/api/system/health` | OK JSON | Not recorded |  |
| `/api/system/manifest` | Route/API data | Not recorded |  |
| `/api/system/capabilities` | Capability data | Not recorded |  |
| `/api/system/integration-contract` | Full contract | Not recorded |  |
| `/api/system/launch-boundary` | Fallback/live-provider boundary | Not recorded |  |
| `/api/system/urai-spatial-lock` | Lock state | Not recorded |  |
| `/api/system/urai-spatial-3d-world` | 3D world model | Not recorded |  |
| `/api/body-biometric` | Fallback response with no private implementation detail | Not recorded |  |
| `/api/orb-companion` | Route-aware fallback response with no private implementation detail | Not recorded |  |

## Provider evidence

Provider rows must remain `Not recorded` until the provider has been configured, smoke-tested, and copy-reviewed.

| Provider / capability | Result | Evidence / notes |
| --- | --- | --- |
| Firebase Hosting or App Hosting | Not recorded |  |
| Firebase Auth | Not recorded |  |
| Firestore rules and indexes | Not recorded |  |
| Owner/tenant scoped read/write tests | Not recorded |  |
| Stripe checkout | Not recorded |  |
| Stripe webhook-v2 | Not recorded |  |
| Entitlement write to `userEntitlements/{uid}` | Not recorded |  |
| Paid panel lock/unlock behavior | Not recorded |  |
| AR/WebXR provider | Not recorded |  |
| Wearable provider | Not recorded |  |
| Body-signal provider | Not recorded |  |
| Memory-grounded orb | Not recorded |  |
| Asset Factory integration | Not recorded |  |
| Studio integration | Not recorded |  |
| Jobs integration | Not recorded |  |
| Cross-repo memory sync | Not recorded |  |

## Release decision

Do not change this to `production-live` until the applicable local, release, deploy, live smoke, and provider sections are filled in.

- Current release decision: `fallback-demo / automation wired / evidence pending`.
- Decision date: not recorded.
- Approver: not recorded.
