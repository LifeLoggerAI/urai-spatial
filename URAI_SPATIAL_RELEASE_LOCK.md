# URAI Spatial Release Lock

> **SUPERSEDED HISTORICAL SNAPSHOT — DO NOT USE AS CURRENT DEPLOYMENT AUTHORITY.**
>
> This file records a May 7, 2026 branch snapshot and intentionally preserves its historical command text for audit history. Current canonical source explicitly quarantines production mutation: `.github/workflows/spatial-live-deploy.yml` is verification + short-lived read-only WIF identity proof only, and `scripts/live-release.mjs deploy` fails closed. The `firebase deploy` and hosting-clone commands below must not be executed as current URAI Spatial release authority. Use current `DEPLOYMENT.md`, `ENVIRONMENT.md`, and `docs/LIVE_DEPLOY_RUNBOOK.md` for the present fail-closed boundary.

## Snapshot

- Date/time UTC: 2026-05-07
- Branch: `release/urai-spatial-finish-e2e-lock`
- App root: `urai-tier1`
- Package manager: `pnpm`
- Node version: 22+
- Framework: Next.js / React / TypeScript
- Service: `urai-spatial`
- Product: URAI Spatial

## Release scope

This release-lock pass adds a stable standalone URAI Spatial shell and typed fallback contracts without deleting the existing spatial engine. The shell covers:

- Home spatial shell
- Orb Companion
- Avatar/body region panels
- Body biometric fallback API
- Sky LifeMap preview
- Ground/world preview
- Full LifeMap release surface
- System health/manifest/capabilities/integration-contract APIs
- Smoke route checker
- E2E specs for home and LifeMap

## Commands run

| Command | Result | Notes |
|---|---:|---|
| GitHub repo/branch inspection | PASS | Performed through GitHub connector |
| `pnpm install` | NOT RUN | Local checkout/runtime unavailable in this environment |
| `pnpm lint` | NOT RUN | Requires local checkout/runtime |
| `pnpm typecheck` | NOT RUN | Requires local checkout/runtime |
| `pnpm build` | NOT RUN | Requires local checkout/runtime |
| `HOST=http://127.0.0.1:3000 pnpm smoke` | NOT RUN | Requires running local server |
| `pnpm test:e2e` | NOT RUN | Requires Playwright runtime/browser deps |
| `pnpm launch:check` | NOT RUN | Requires local checkout/runtime |

## Required verification sequence

```bash
pnpm install
pnpm check:spatial
pnpm typecheck
pnpm build
pnpm dev
HOST=http://127.0.0.1:3000 pnpm smoke
pnpm test:e2e
pnpm launch:check
```

## Routes expected

- `/`
- `/spatial`
- `/life-map`
- `/privacy`
- `/terms`

## APIs expected

- `GET /api/system/health`
- `GET /api/system/manifest`
- `GET /api/system/capabilities`
- `GET /api/system/integration-contract`
- `POST /api/body-biometric`
- `POST /api/orb-companion`

## Known limitations

- Live Firebase, wearable, passive-inference, AR/WebXR, and memory-grounded providers are not asserted as live.
- Fallback/demo behavior is explicit and deterministic.
- Final pass/fail status depends on running `pnpm launch:check` in CI or a local checkout with dependency/network access.

## Historical deployment command

```bash
pnpm launch:check
firebase deploy --only hosting
```

## Historical rollback command

```bash
git revert <release-commit-sha>
firebase hosting:clone <source-site>:<previous-version> <target-site>:live
```

## Final status

PARTIAL — implementation branch is prepared and ready for CI/local validation, but full commands were not executable from this connector-only environment.
