# URAI Spatial Testing

Date: 2026-05-16
Runtime app root: `urai-tier1`

## Testing posture

URAI Spatial uses layered tests and release gates: static integrity checks, TypeScript checks, Next.js build, smoke route checks, Firestore rule boundary checks, XR contract validation, Playwright/E2E checks, and tier/canon lock scripts.

This file documents the intended command sequence and interpretation of results.

## Fast local validation

```bash
pnpm install
pnpm check:spatial
pnpm typecheck
pnpm build
```

Expected result:

- spatial invariant passes;
- TypeScript exits with code 0;
- Next.js production build exits with code 0.

## Runtime smoke validation

Terminal 1:

```bash
pnpm dev
```

Terminal 2:

```bash
HOST=http://127.0.0.1:3000 pnpm smoke
```

Expected result:

- documented routes return successful responses;
- system APIs return JSON without secrets;
- fallback APIs return safe deterministic responses.

## Release gate

```bash
pnpm launch:check
```

`launch:check` is intended to run spatial invariant, typecheck, production build, smoke route checks, and E2E lock runner through the repository release workflow.

## Tier-one audit

```bash
pnpm audit:tier-one
```

Expected scope:

- Tier1/canon immutability checks;
- runtime authority checks;
- home invariant checks;
- Firestore boundary checks;
- typecheck;
- production build.

## Full release verification

```bash
pnpm verify:release
pnpm verify:release:full
```

Use `verify:release:full` before final release branches or tags.

## E2E and Playwright

Install/ensure browser runtime:

```bash
pnpm playwright:ensure
```

Run E2E:

```bash
pnpm test:e2e
pnpm test:e2e:lock
pnpm test:e2e:navigation-stack
pnpm test:e2e:camera-transitions
pnpm test:e2e:race-conditions
pnpm test:e2e:data-states
pnpm test:visual:spatial
```

Expected result:

- navigation stack remains stable;
- camera transitions remain deterministic;
- race/data states do not break spatial shell;
- visual lock tests pass or update intentionally with reviewed snapshots.

## XR validation

```bash
pnpm xr:contract
pnpm xr:navmesh:bake
pnpm xr:verify
```

Expected result:

- XR runtime contract passes;
- navmesh bake completes;
- Quest/device validation script completes according to available local/device context;
- Firebase XR preflight passes if configured.

## Firebase rules and provider checks

```bash
pnpm firebase:rules:check
pnpm test:rules
```

Expected result:

- rules align with Tier1 boundaries;
- owner/tenant scoped reads and writes are enforced;
- no broad unauthenticated live write paths are enabled.

## Replay / LifeMap checks

```bash
pnpm test:replay-contract
pnpm test:replay-tier5
pnpm --dir urai-tier1 test:lifemap
```

Expected result:

- replay contracts pass;
- LifeMap behavior tests pass;
- tier5 replay lock stays intact.

## Live release check

```bash
pnpm live:check
```

Expected result:

- live release gate passes without deploying.

To deploy after this gate:

```bash
FIREBASE_PROJECT_ID=<project-id> pnpm live:deploy
```

## Failure policy

When a command fails:

1. Capture the exact command and exit output.
2. Fix source/config errors before retrying.
3. Do not bypass tier/canon locks unless the lock doc is intentionally updated.
4. Do not claim production readiness until the failing command passes.
5. If failure depends on missing secrets, document the exact variable and deployment provider where it must be set.

## Minimum done-done checklist

- [ ] `pnpm install` succeeds.
- [ ] `pnpm check:spatial` succeeds.
- [ ] `pnpm typecheck` succeeds.
- [ ] `pnpm build` succeeds.
- [ ] Local `pnpm smoke` succeeds against running app.
- [ ] `pnpm test:e2e` succeeds or documented as blocked by local browser/runtime.
- [ ] `pnpm audit:tier-one` succeeds.
- [ ] `pnpm live:check` succeeds.
- [ ] Firebase deploy succeeds.
- [ ] Production smoke routes succeed.
- [ ] Stripe test payment writes entitlement if paid features are enabled.
- [ ] No live-provider claims are published before provider verification.

## Connector-pass note

This document was created during a GitHub/Drive connector pass. The connector could inspect and write files but could not execute pnpm, Next.js, Firebase CLI, Playwright, or Stripe flows. Treat all unchecked boxes above as required local/CI work before launch claims.
