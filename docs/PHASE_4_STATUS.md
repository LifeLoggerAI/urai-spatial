# Phase 4 Status: LifeMap, Memory Stars, and Replay

Status: patched, pending validation in CI or a real checkout.

## Implemented

- Added a memory star schema and privacy resolver.
- Added demo-safe memory star nodes from bundled launch data.
- Added public redaction helper for private memory provenance.
- Added direct route wrappers:
  - `/life-map/star/[starId]`
  - `/focus/session/[sessionId]`
  - `/replay/[replayId]`
- Added a focused Phase 4 contract test:
  - `urai-tier1/tests/memory-star-phase4-contract.test.mjs`
- Added a focused unit contract test runner:
  - `urai-tier1/scripts/run-unit-contract-tests.mjs`
- Rewired `urai-tier1` unit tests to use the focused runner.

## Safety boundary

Phase 4 direct routes resolve only launch-safe demo identifiers. Unknown or non-demo identifiers fail closed into a safe LifeMap return path. No private Firestore user data is read by the memory star schema.

## Still not claimed

- Production-live private memory replay is not claimed.
- Live provider memory grounding is not claimed.
- Full replay theater maturity is not claimed.
- XR/AR/VR is not claimed.
- Asset Factory materialization is not live and is not claimed.

## Known follow-up

`urai-tier1/tests/spatial-route-contract.test.mjs` still contains older assertions from before the silent Home invariant. The file should be rewritten or archived when the connector permits a safe change. Until then, focused contract tests are used for the default unit path.

## Required validation

Run from repo root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm --filter urai-tier1 test:unit
pnpm --filter urai-tier1 test:lifemap
pnpm typecheck
pnpm build
pnpm launch:check
```

## Definition of done

Phase 4 is fully done when the commands above pass and the stale route contract file has been reconciled with the silent Home and direct route contracts.
