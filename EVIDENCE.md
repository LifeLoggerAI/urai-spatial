# URAI Spatial Release Evidence

This file is the evidence ledger for URAI Spatial. Do not mark the repository production-live from assumptions, README claims, or local memory. Record command output, deploy references, dates, commit SHAs, and live smoke results here.

## Current status

- Evidence status: automation wiring recorded; live release evidence in progress.
- Runtime app root: `urai-tier1`.
- Current release mode: `fallback-demo`.
- Production-live status: not verified.
- Deployment automation: `.github/workflows/spatial-live-deploy.yml` verifies `pnpm live:check` on configured `main` push paths with `pnpm install --frozen-lockfile` and can deploy only after verification when manually dispatched with `deploy=DEPLOY` or when repo variable `URAI_SPATIAL_AUTO_DEPLOY=true` is configured.
- Tier/XR release matrix: `release/tier-xr-release-matrix.json`.
- Automation trigger scope: `urai-tier1/**`, `apps/functions/**`, `packages/**`, `scripts/**`, `tests/**`, `src/canon/**`, `docs/canon/**`, `docs/decisions/**`, `release/**`, `audit/**`, `firebase/**`, Firebase config files, root package/lock/workspace files, `.nvmrc`, `.node-version`, README/status/deployment/evidence docs, runtime authority docs, and all workflow files under `.github/workflows/**`.
- Automation trigger coverage: README, portable Node runtime pin, and decision-record coverage added in commit `878d66b5eba02c3aefb45715d717f473312044ff`. Full workflow guardrail coverage added in commit `42ccdf1a8b39200cd69d2650e72f768031f30093`. Frozen-lockfile verification hardening added in commit `d1c256d26807dc3260dc3683dd30e6b8fb8e2247`. All-tier/XR trigger and artifact coverage added in commit `62aeb71bb4b259127ddd97eea58f05e39fb51478`.
- Latest release-gate observation: workflow run `26812805807` for commit `b5922c6d428c7cb80e1954e6032678152a70652e` triggered successfully and uploaded artifact `7354762010`, but failed in `pnpm live:check` because `urai-tier1/src/app/page.tsx` still routed home through `UraiV1Experience` instead of `TierOneExperience mode="home"`. Commits `2844163dffeec8ad83cacdc6f5805e5f4412be91` and `e9c7ad3d3af231b55049d0de1e4f593410815095` route `/` and `/home` through `TierOneExperience mode="home"`. Commits `62aeb71bb4b259127ddd97eea58f05e39fb51478`, `c229c6d1452633bb285bfaba7ee9012c9ad0b6ca`, and `1180b5a9b3c3e16eabece7c16bccb7ebe91fe0a7` expand the all-tier/XR evidence surface and retrigger the gate; the connector/web listing has not exposed a newer run id yet.

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

## Tier 1-5 evidence

| Tier | Scope | Required gate | Result | Evidence / notes |
| --- | --- | --- | --- | --- |
| Tier 1 | Runtime authority, home invariant, Firebase boundaries | `pnpm urai:tier1` | Rerun pending | Runtime route and home-silence blockers fixed through commits `6f940e8c7379f13551a22ffb19bfac816ef00f9e`, `b5922c6d428c7cb80e1954e6032678152a70652e`, `2844163dffeec8ad83cacdc6f5805e5f4412be91`, and `e9c7ad3d3af231b55049d0de1e4f593410815095`. |
| Tier 2 | System governance and mapped runtime paths | `pnpm urai:tier2` | Not recorded | Matrix file added at `release/tier-xr-release-matrix.json`; CI artifact coverage expanded to include `src/canon/**` and `docs/canon/**`. |
| Tier 3 | Feature, route, interaction, accessibility, and recovery governance | `pnpm urai:tier3` | Not recorded | Requires visible route/E2E evidence before marking complete. |
| Tier 4 | Implementation, reduced motion, Firebase, env, typecheck, build | `pnpm urai:tier4` | Not recorded | Requires typecheck/build/reduced-motion/Firebase evidence before marking complete. |
| Tier 5 | Operational CI, artifacts, rollback, incident, release reporting | `pnpm urai:tier5` | Not recorded | Workflow artifacts now include tier canon, release, audit, Firebase, and XR evidence surfaces. |

## Release verification

| Gate | Command | Result | Evidence / notes |
| --- | --- | --- | --- |
| Full release check | `pnpm live:check` | Failed on live gate; rerun pending | Run `26812240951` failed in runtime boundary check because `.github/workflows/urai-production-verify.yml` used npm in a pnpm workspace; fixed by commit `5dd9613aa64883b1a3f04bff766d2b9e0c4b3c36`. Run `26812477972` then failed home invariant guards for camera reset, mode guidance, and replay keyboard silence; fixed by commit `6f940e8c7379f13551a22ffb19bfac816ef00f9e`. Run `26812656154` then failed narrator silent-home guards; fixed by commit `b5922c6d428c7cb80e1954e6032678152a70652e`. Run `26812805807` then failed root route authority for `TierOneExperience mode="home"`; fixed by commits `2844163dffeec8ad83cacdc6f5805e5f4412be91` and `e9c7ad3d3af231b55049d0de1e4f593410815095`. Commit `62aeb71bb4b259127ddd97eea58f05e39fb51478` retriggers the workflow with all-tier/XR evidence artifact coverage. |
| Full release deploy dry gate | `pnpm verify:release:full` | Failed on live gate; rerun pending | Same blocker chain as `pnpm live:check`; deploy job has been skipped while verification fails, as expected. |
| Replay contract | `pnpm test:replay-tier5` | Not recorded |  |
| Firestore boundary check | `pnpm firebase:rules:check` | Not recorded |  |
| XR verification | `pnpm xr:verify` | Not recorded | Required before any XR provider claim. |

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

## AR / VR / XR evidence

Provider rows must remain `Not recorded` or `Not validated` until the target has configured providers, device/runtime tests, smoke evidence, and privacy copy review.

| Target / capability | Required evidence | Result | Evidence / notes |
| --- | --- | --- | --- |
| Web spatial runtime | Live URL route/API smoke, browser E2E, reduced-motion, production build | Not recorded | Web runtime can only become live after deployed URL smoke rows above are filled. |
| WebXR | WebXR runtime contract, permission-safe session handling, browser/device matrix | Not validated | `liveClaims.webxr` remains `disabled-until-provider-validated`. |
| Quest VR | Quest device run, input/controller or hand tracking validation, thermal/performance, comfort review | Not validated | Cannot be certified from web CI alone; requires device-lab evidence. |
| visionOS | visionOS simulator or device run, shared/immersive space safety, accessibility, build artifact | Not validated | Cannot be certified until a visionOS target and device/simulator evidence exist. |
| Handheld AR | AR permission review, camera/session privacy review, mobile device matrix, fallback behavior | Not validated | Cannot be certified until camera/session provider behavior is validated and privacy-reviewed. |
| Wearable provider | Provider configuration, consent, fallback behavior, smoke tests | Not recorded |  |
| Body-signal provider | Provider configuration, privacy review, raw-signal exclusion evidence | Not recorded |  |
| Memory-grounded orb | Provider/data grounding evidence, fallback boundaries, copy review | Not recorded |  |
| Asset Factory integration | Live endpoint/config evidence, deterministic asset proof, approval flow | Not recorded |  |
| Studio integration | Live endpoint/config evidence, export safety, workflow smoke | Not recorded |  |
| Jobs integration | Live endpoint/config evidence, queue/worker smoke, retry/idempotency evidence | Not recorded |  |
| Cross-repo memory sync | Contract evidence, privacy review, rollback plan | Not recorded |  |

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
| AR/WebXR provider | Not validated | See AR / VR / XR evidence section. |
| Wearable provider | Not recorded |  |
| Body-signal provider | Not recorded |  |
| Memory-grounded orb | Not recorded |  |
| Asset Factory integration | Not recorded |  |
| Studio integration | Not recorded |  |
| Jobs integration | Not recorded |  |
| Cross-repo memory sync | Not recorded |  |

## Release decision

Do not change this to `production-live` until the applicable local, tier, release, deploy, live smoke, AR/VR/XR, and provider sections are filled in.

- Current release decision: `fallback-demo / automation wired / evidence pending`.
- Decision date: not recorded.
- Approver: not recorded.
