# URAI Spatial Tier-3 Lock Plan & Status

Date: 2026-05-05 (UTC)
Repo: `urai-spatial`

## Tier-3 acceptance checklist (definition of done)

### Spatial polish
- [ ] Ground tier 3 fully visualized and transitions smoothly with phase context.
- [ ] Home → lifemap → focus → replay → unwind transitions are smooth and deterministic.
- [ ] Replay visuals include stable fallbacks for missing assets/data.

### Live wiring & contracts
- [ ] Live adapter contracts (Firestore or production-safe adapter) are explicit and tested.
- [ ] Symbolic event mapping schema is versioned and validated.
- [ ] Consent/privacy flags are propagated through spatial state and telemetry safely.

### Safety & accessibility
- [ ] Reduced-motion equivalent exists for all Tier-3 animations.
- [ ] Mobile viewport/full-screen lock verified for small devices.
- [ ] Accessibility labels/focus behaviors are present outside home-invariant-sensitive surfaces.
- [ ] No debug/dev UI in production modes.

### QA lock
- [ ] Tier-1/Tier-2 regression suites pass.
- [ ] Tier-3 state/render suites pass.
- [ ] Home invariant test suite passes.
- [ ] Production build passes.

## Current status
- **Tier-3 verdict: NOT LOCKED**

### Why NOT LOCKED
1. Automated test suite is red (multiple failures, including missing module/export and stale tests).
2. Install reproducibility is blocked in this environment (lock drift + registry 403).
3. Tier-3 acceptance evidence (render/state/accessibility/reduced-motion/mobile/e2e) is incomplete while unit/e2e baseline is not fully green.

## Changes made in this pass (safe, non-redesign)
- Type/contract and invariant-safety fixes were applied to unblock runtime/typecheck drift:
  - life-map shell mode contract alignment
  - removal of home overlay debug audio UI
  - component prop contract corrections
  - companion memory signal payload completion
  - telemetry event name alignment with declared union

## Commands run
- `pnpm -v && node -v && pnpm install --frozen-lockfile`
- `pnpm install --no-frozen-lockfile`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm --filter urai-tier1 test`

## Remaining blockers
### P0
- Missing module import path (`homeWorldDefaults`).
- Missing expected export (`pickGlowingStars`) or outdated tests.
- Red test suite (9 failures).

### P1
- Home invariant enforcement still relies on convention; needs hard CI gate.
- Contract tests for live adapters/consent states not comprehensive.

### P2
- Lint pipeline is effectively a typecheck alias; style/static policy not enforced.

## Founder sign-off checklist
- [ ] Confirm home invariant remains absolute (no text/buttons/nav/onboarding/narration at home).
- [ ] Approve any unavoidable invariant exception with explicit version bump.
- [ ] Approve telemetry contract and event namespace freeze.
- [ ] Approve Firestore/fallback adapter contract and privacy guarantees.
- [ ] Require green CI gates: install, typecheck, lint, unit, e2e, build.
- [ ] Record final Tier-3 lock artifact and tag release commit.
