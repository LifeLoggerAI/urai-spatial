# URAI Spatial Tier Lock Report

Branch: `audit/spatial-runtime-lock-polish`
Status date: 2026-05-07

## Summary

This pass locks the launch runtime around the canonical path:

```txt
TierOneExperience -> HomeScene
```

It also adds app-level loading/error/not-found boundaries, strengthens preflight and CI, and documents the exact Bash/pnpm validation chain.

## Tier status

| Tier | Status | Evidence | Remaining blocker |
| --- | --- | --- | --- |
| Tier 1 | LOCKED CANDIDATE | Repo structure, package manager pin, preflight coverage, Firebase targets, and runtime authority script are present. | Needs CI run on GitHub. |
| Tier 2 | LOCKED CANDIDATE | Canonical routes include `/`, `/home`, `/ascent`, `/life-map`, `/focus`, `/replay`, and `/mirror`. | Needs E2E run on GitHub. |
| Tier 3 | LOCKED CANDIDATE | Typecheck/build/test commands are documented and wired in CI. | Needs dependency install and full build run. |
| Tier 4 | LOCKED CANDIDATE | CI checks preflight, runtime authority, app tests, functions tests, E2E, replay Tier 5, and Firebase deploy references. | Requires GitHub Actions pass. |
| Tier 5 | PARTIAL | Production handoff docs and launch lock ledger exist. | Manual signoffs and live Firebase preview/production smoke remain required. |

## Completed audit items

- Added pinned package manager metadata: `pnpm@8.15.9`.
- Fixed Firebase Functions predeploy to run app typecheck and functions build.
- Added runtime authority governance check.
- Added `/ascent` to tier route coverage.
- Added app-level loading, error, and not-found boundaries.
- Added production runbook.
- Expanded preflight to catch missing docs, E2E drift, CI drift, and runtime authority drift.
- Updated CI to validate the canonical runtime path.

## Validation commands

Run from repo root:

```bash
corepack enable
corepack prepare pnpm@8.15.9 --activate
pnpm install
node scripts/preflight.mjs
pnpm runtime:authority
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 test
pnpm --filter urai-tier1 build
pnpm --filter urai-functions build
pnpm --filter urai-functions test
pnpm --filter urai-tier1 exec playwright install --with-deps chromium
pnpm test:e2e
pnpm test:replay-tier5
pnpm test:canon
```

## Known limitations

- Local execution in the current assistant container was blocked by network/DNS in earlier passes, so dependency install and E2E must run in GitHub Actions or a developer machine with registry access.
- Production lock still requires the human signoff ledger in `verification/signoffs.md` to be completed.
- Firebase preview and production smoke require real project credentials and authorized domains.

## Recommended next action

Open the pull request, let GitHub Actions run, then fix any concrete CI failures from logs.
