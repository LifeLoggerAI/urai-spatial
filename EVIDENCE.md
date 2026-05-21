# URAI Spatial Release Evidence

This file is the evidence ledger for URAI Spatial. Do not mark the repository production-live from assumptions, README claims, or local memory. Record command output, deploy references, dates, commit SHAs, and live smoke results here.

## Current status

- Evidence status: not yet recorded for this branch.
- Runtime app root: `urai-tier1`.
- Current release mode: `fallback-demo`.
- Production-live status: not verified.

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
| Full release check | `pnpm live:check` | Not recorded |  |
| Full release deploy dry gate | `pnpm verify:release:full` | Not recorded |  |
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

- Current release decision: `fallback-demo / evidence pending`.
- Decision date: not recorded.
- Approver: not recorded.
