# URAI Spatial Tier Lock Audit (Tier-1 / Tier-2)

Date: 2026-05-05 (UTC)
Repo: `urai-spatial`
Auditor: Codex (GPT-5.3-Codex)

## Executive Verdict
- **Tier-1: NOT LOCKED**
- **Tier-2: NOT LOCKED**

Rationale: Build/typecheck is now green for `urai-tier1`, but test suite and install pipeline still contain hard blockers (missing modules/exports and stale/structural tests). Home invariant risk and dev leakage risks are still present in non-prod configurations.

## Scope audited
- Routes: `src/app/*`
- Spatial scene and state: `src/spatial/**/*`
- Tests: `tests/*.test.mjs`, top-level `tests/*.mjs`, `tests/*.spec.ts`
- Config/build: root + `urai-tier1` package scripts/config
- Data contracts: LifeMap model, companion contracts, analytics events

## Commands run (exact)
1. `pnpm -v && node -v && pnpm install --frozen-lockfile`
2. `pnpm install --no-frozen-lockfile`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm --filter urai-tier1 test`

## Results summary
- Install with frozen lockfile failed due to lock drift.
- Install without frozen lockfile failed due to 403 on npm registry for `firebase`.
- Typecheck failed initially, then passed after safe fixes.
- Lint command passed (currently aliases runtime typecheck).
- Unit tests failed (9 failures), including missing module/export and stale content-regex assertions.

## Findings (ranked)

### P0 blockers (must fix to lock)
1. **Test suite not green; Tier lock cannot be claimed**
   - Missing module at runtime: `src/spatial/home/homeWorldDefaults` import target not found from `homeWorldSignalDerivation.ts`.
   - Missing export expected by tests: `pickGlowingStars` not exported by `src/components/spatial/lifemapSceneLogic.ts`.
   - Multiple tests assert old implementation by regex against a compatibility wrapper file, causing false failures.

2. **Dependency/install pipeline blocked in current environment**
   - Lockfile drift (`pnpm-lock.yaml` vs root `package.json`) and package fetch 403 block fresh reproducible install.

### P1 blockers
1. **Home invariant risk from non-prod debug affordances and overlays**
   - Debug overlays and source badges are conditionally rendered in non-production paths; invariant requires strict no-text/no-ui behavior at home.
   - A direct home-overlay audio toggle existed and was removed in this pass; additional invariant hardening still recommended.

2. **Route/shell semantics mismatch**
   - Life-map route passed unsupported shell mode before fix (`lifemap` instead of allowed mode), indicating boundary drift between route layer and shell contract.

### P2 risks
1. **Analytics event taxonomy drift**
   - Star click telemetry used unregistered event name before fix, indicating weak event contract governance.
2. **Type safety regressions in companion payload composition**
   - Companion memory payloads lacked required contract fields before fix.

## Safe fixes applied during audit
- Fixed `SpatialShell` mode usage on life-map route.
- Removed home overlay debug audio button and invalid prop wiring.
- Fixed `PresenceRig` invocation to match current component signature.
- Brought companion pipeline input and memory signal payloads into type-safe contract alignment.
- Replaced invalid launch event token with supported event emission payload.

## Recommended patches (next)
1. Restore/replace missing `homeWorldDefaults` module and cover with import smoke test.
2. Export (or stop testing for) `pickGlowingStars`; align tests to real public API.
3. Rewrite regex-based brittle tests to behavior-level assertions (render/state transitions).
4. Enforce home invariant via a dedicated CI gate test that fails on any text/button/nav in `/` home.
5. Separate `lint` from `typecheck` and add true eslint/style checks.
6. Resolve lockfile drift and private-registry policy for deterministic CI installs.

## Tests to add
- Home invariant snapshot/test: DOM text/buttons/nav must be absent at `/`.
- Lifemap focus/replay/unwind behavior tests against live state machine (not source regex).
- Reduced-motion test with media-query simulation for Home + LifeMap transitions.
- Mobile full-screen viewport lock test for iOS/Android safe-area behavior.
- Adapter contract tests for firestore/fallback parity and privacy-level propagation.

## Founder lock checklist
- [ ] `pnpm install --frozen-lockfile` passes in CI.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` (real lint) passes.
- [ ] `pnpm --filter urai-tier1 test` passes.
- [ ] E2E home→lifemap→focus→replay→unwind passes.
- [ ] Home invariant CI gate passes (no text/buttons/nav/onboarding/narration on home).
- [ ] Reduced-motion and mobile viewport suites pass.
- [ ] Firestore + fallback adapter contract tests pass.
- [ ] No debug/dev UI leakage in production artifacts.


## Tier-1 canon centralization + protection update (this pass)
- Added canonical source module: `urai-tier1/src/canon/tier1.ts`.
- Added canonical standards doc: `docs/canon/TIER_1_CANON_STANDARDS.md`.
- Added migration policy: `CANON_MIGRATION_PROCESS.md`.
- Added CI lock gate script: `scripts/check-tier1-canon-lock.mjs`.
- Added CODEOWNERS coverage for canon files: `.github/CODEOWNERS`.
- Added canon tests: `urai-tier1/tests/tier1-canon-lock.test.mjs` and `urai-tier1/tests/tier1-canon-naming.test.mjs`.
- Added CI workflow enforcement step for `pnpm canon:lock`.
