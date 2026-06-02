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
- Tier/XR release enforcement: `scripts/check-tier-xr-release-matrix.mjs` added in commit `ceda0b7f69bf13cfcb5028c99acfda0bccf6cc99`. Root release scripts now run `check:tier-xr-release-matrix` during `lock:static` and run `xr:verify` during `verify:release:full` in commit `723deaca998973ac1bf16ea0c7856e26a4ef75aa`. The `pnpm live:check` wrapper now validates Tier/XR manifest scope, matrix presence, required files, and blocked AR/VR/XR live claims before full verification in commit `bb2d7d88143c6329c3a7348da16aa376594e6956`.
- Cross-repo dependency gates: Asset Factory XR dependency gate added in `LifeLoggerAI/asset-factory` commit `99096224d54a2849731e58de514c3fe07ec5918c`; content/schema XR dependency gate added in `LifeLoggerAI/urai-content` commit `797aee018b901053263d0f4b37f25a82dcfbb289`; staging release-train gate added in `LifeLoggerAI/urai-staging` commit `545c48855f05325a16f28721058fec3b1672a03a`.
- Latest release-gate observation: workflow run `26812805807` for commit `b5922c6d428c7cb80e1954e6032678152a70652e` triggered successfully and uploaded artifact `7354762010`, but failed in `pnpm live:check` because `urai-tier1/src/app/page.tsx` still routed home through `UraiV1Experience` instead of `TierOneExperience mode="home"`. Commits `2844163dffeec8ad83cacdc6f5805e5f4412be91` and `e9c7ad3d3af231b55049d0de1e4f593410815095` route `/` and `/home` through `TierOneExperience mode="home"`. Later commits expand and enforce the all-tier/XR evidence surface; the connector/web listing has not exposed a newer run id yet.

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
| Tier 2 | System governance and mapped runtime paths | `pnpm urai:tier2` | Gate wired; run pending | Matrix file added at `release/tier-xr-release-matrix.json`; CI artifact coverage expanded to include `src/canon/**` and `docs/canon/**`. |
| Tier 3 | Feature, route, interaction, accessibility, and recovery governance | `pnpm urai:tier3` | Gate wired; run pending | Requires visible route/E2E evidence before marking complete. |
| Tier 4 | Implementation, reduced motion, Firebase, env, typecheck, build | `pnpm urai:tier4` | Gate wired; run pending | Requires typecheck/build/reduced-motion/Firebase evidence before marking complete. |
| Tier 5 | Operational CI, artifacts, rollback, incident, release reporting | `pnpm urai:tier5` | Gate wired; run pending | Workflow artifacts now include tier canon, release, audit, Firebase, and XR evidence surfaces. |

## Release verification

| Gate | Command | Result | Evidence / notes |
| --- | --- | --- | --- |
| Full release check | `pnpm live:check` | Failed on live gate; rerun pending | Run `26812240951` failed in runtime boundary check because `.github/workflows/urai-production-verify.yml` used npm in a pnpm workspace; fixed by commit `5dd9613aa64883b1a3f04bff766d2b9e0c4b3c36`. Run `26812477972` then failed home invariant guards for camera reset, mode guidance, and replay keyboard silence; fixed by commit `6f940e8c7379f13551a22ffb19bfac816ef00f9e`. Run `26812656154` then failed narrator silent-home guards; fixed by commit `b5922c6d428c7cb80e1954e6032678152a70652e`. Run `26812805807` then failed root route authority for `TierOneExperience mode="home"`; fixed by commits `2844163dffeec8ad83cacdc6f5805e5f4412be91` and `e9c7ad3d3af231b55049d0de1e4f593410815095`. Commits `723deaca998973ac1bf16ea0c7856e26a4ef75aa` and `bb2d7d88143c6329c3a7348da16aa376594e6956` add enforced Tier/XR matrix, blocked-claim validation, and XR verification to the release gate. |
| Full release deploy dry gate | `pnpm verify:release:full` | Failed on live gate; rerun pending | Same blocker chain as `pnpm live:check`; deploy job has been skipped while verification fails, as expected. Full release now includes `xr:verify`. |
| Replay contract | `pnpm test:replay-tier5` | Not recorded |  |
| Firestore boundary check | `pnpm firebase:rules:check` | Not recorded |  |
| Tier/XR matrix check | `pnpm check:tier-xr-release-matrix` | Gate wired; run pending | Added in commit `ceda0b7f69bf13cfcb5028c99acfda0bccf6cc99` and included in `lock:static` in commit `723deaca998973ac1bf16ea0c7856e26a4ef75aa`. |
| XR verification | `pnpm xr:verify` | Gate wired; run pending | Required before any XR provider claim; now included in `verify:release:full`. This is repo/runtime preflight, not Quest/visionOS device certification. |

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
| WebXR | WebXR runtime contract, permission-safe session handling, browser/device matrix | Gate wired; not provider-validated | `liveClaims.webxr` remains `disabled-until-provider-validated`; `xr:verify` now runs in full release. |
| Quest VR | Quest device run, input/controller or hand tracking validation, thermal/performance, comfort review | Gate wired; not device-validated | Repo Quest/WebXR runtime preflight is wired, but device-lab evidence is still required. |
| visionOS | visionOS simulator or device run, shared/immersive space safety, accessibility, build artifact | Not validated | Cannot be certified until a visionOS target and device/simulator evidence exist. |
| Handheld AR | AR permission review, camera/session privacy review, mobile device matrix, fallback behavior | Not validated | Cannot be certified until camera/session provider behavior is validated and privacy-reviewed. |
| Wearable provider | Provider configuration, consent, fallback behavior, smoke tests | Not recorded |  |
| Body-signal provider | Provider configuration, privacy review, raw-signal exclusion evidence | Not recorded |  |
| Memory-grounded orb | Provider/data grounding evidence, fallback boundaries, copy review | Not recorded |  |
| Asset Factory integration | Cross-repo gate exists; production evidence not recorded | `LifeLoggerAI/asset-factory` commit `99096224d54a2849731e58de514c3fe07ec5918c` adds `docs/release-evidence/urai-spatial-xr-dependency.md`. Still requires provider-backed generation, cross-tenant denial, queue/DLQ, webhook/idempotency, redaction, approval-manifest, rollback, and owner approval evidence. |
| Content/schema integration | Cross-repo gate exists; production evidence not recorded | `LifeLoggerAI/urai-content` commit `797aee018b901053263d0f4b37f25a82dcfbb289` adds `docs/evidence/urai-spatial-xr-schema-dependency.md`. Still requires package/runtime/deployed smoke, observability, rollback, versioned schema pinning, moderation, entitlement, and release logging evidence. |
| Staging release train | Cross-repo gate exists; staging evidence not recorded | `LifeLoggerAI/urai-staging` commit `545c48855f05325a16f28721058fec3b1672a03a` adds `URAI_XR_RELEASE_TRAIN_GATE.md`. Still requires deploy readiness, full repo check, rules/E2E, locked staging deploy, live staging smoke, rollback, and public-repo safety evidence. |
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
| Asset Factory integration | Cross-repo gate exists; evidence not complete | See AR / VR / XR evidence section. |
| Content/schema integration | Cross-repo gate exists; evidence not complete | See AR / VR / XR evidence section. |
| Staging release train | Cross-repo gate exists; evidence not complete | See AR / VR / XR evidence section. |
| Studio integration | Not recorded |  |
| Jobs integration | Not recorded |  |
| Cross-repo memory sync | Not recorded |  |

## Release decision

Do not change this to `production-live` until the applicable local, tier, release, deploy, live smoke, AR/VR/XR, and provider sections are filled in.

- Current release decision: `fallback-demo / automation wired / evidence pending`.
- Decision date: not recorded.
- Approver: not recorded.
