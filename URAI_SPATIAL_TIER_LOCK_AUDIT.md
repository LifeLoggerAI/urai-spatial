# URAI Spatial Tier Lock Audit
Date: 2026-05-05 (UTC)
Repo: `urai-spatial`
Auditor: Codex

## Executive Verdict

- **Tier-1: NOT LOCKED**
- **Tier-2: NOT LOCKED**

Primary reason: the runtime still contains hard blockers (corrupted source file that fails production build, explicit demo/internal routes in shipped app tree, and Home-invariant conflicts such as onboarding/UI overlays and route shell text in core spatial routes).

---

## Scope audited

- App routes: `urai-tier1/src/app/**`
- Spatial runtime scene stack: `urai-tier1/src/spatial/**`
- Supporting components, tests, and scripts referenced by workspace root `package.json`.
- Validation commands run: install, lint, build, canon lock test, e2e script attempt.

---

## What was fixed directly (safe, non-redesign)

1. **Resolved merge conflict markers in `SpatialScene.tsx`** by preserving both branches’ intended functionality:
   - retained `ThreeSceneRoot` wrapping
   - retained audio narrator bridges
   - retained click analytics + focus transition
2. **Fixed client route typing/runtime for invite page** by switching from props `params` to `useParams()` in a client component.

These were production-safety fixes only.

---

## Tier-1 Criteria Audit (Core Spatial Foundation)

### 1) Home invariant (no text/buttons/nav/onboarding/narration on home)
**Status: FAIL (P0)**

Evidence of invariant conflicts in active runtime:
- Onboarding overlay (`FirstLightExperience`) is rendered in scene runtime before completion. (`SpatialScene.tsx`, line 114)
- Companion orb/card UI overlays are rendered as fixed HUD elements. (`SpatialScene.tsx`, lines 116-125)
- Life-map route is wrapped in `SpatialShell` with text timeline (`"Life Map"`), creating UI chrome in primary path. (`src/app/life-map/page.tsx`, lines 8-12)
- Demo route contains explicit intro text/buttons and recording controls. (`src/app/demo/page.tsx`, lines 68-145)

### 2) Sky-first spatial entry + full-screen spatial stage
**Status: PARTIAL**
- Root route uses `SpatialSceneClient` directly (good baseline). (`src/app/page.tsx`, lines 1-4)
- However, alternate route wrappers (`SpatialShell`) inject additional non-spatial chrome in core flows (`/life-map`, `/focus`, `/replay`).

### 3) No dev UI leakage
**Status: FAIL (P0/P1)**
- Public app tree contains explicit demo and internal/admin routes:
  - `/demo`, `/demo/life-map`, `/internal/locks`, `/admin/invites`, `/brand-system`, `/early-access`.
- Unity overlay ships placeholder export payload behavior. (`UnityAdapterOverlay.tsx`, lines 49-55)

### 4) Stable LifeMap transition (home→lifemap→focus→replay→unwind)
**Status: PARTIAL / UNPROVEN**
- Phase pipeline exists in scene state assumptions and test references, but end-to-end lock is not provable because e2e could not execute in this environment (missing Playwright browser binaries).

### 5) Safe unwinding + reduced motion + mobile layout
**Status: PARTIAL**
- Existing tests for reduced-motion/mobile are present per repo structure (`tests/spatial-lock.mjs`, `tests/homeworld.smoke.spec.ts`), but cannot currently be re-validated here without Playwright browser install.

### 6) No broken routes / no placeholder experience
**Status: FAIL (P0)**
- Corrupted source file breaks production build type stage: `LifeMap.corrupt.1777855010.tsx` contains control-sequence garbage in source. (line 3)
- Placeholder bundle export string in Unity adapter (`"Tier lock bundle payload"`) indicates non-production placeholder behavior. (`UnityAdapterOverlay.tsx`, line 50)

---

## Tier-2 Criteria Audit (Polish + Symbolic State Lock)

### 1) Ground tier 1/2 behavior + fallback-safe visuals
**Status: PARTIAL**
- Ground-tier architecture and fallback code paths exist, but production lock is blocked by unresolved demo-fallback defaults and corrupted build surface.

### 2) Accessibility + motion safety
**Status: PARTIAL / UNPROVEN**
- Several buttons include labels and semantics, but there is substantial overlay/control UI; no completed accessibility gate report in this run.
- Reduced-motion behavior appears to exist in tests/config, but e2e validation blocked by environment setup.

### 3) Test coverage lock
**Status: FAIL (P1)**
- Canon lock test passes.
- Full Tier lock e2e cannot run due to missing browser executable in this environment.

### 4) Data/schema readiness
**Status: PARTIAL (P1)**
- Demo fallback remains hardcoded across spatial data paths (`demo-user`, `demo-fallback`, seeded demo references), which is acceptable for resilience but not fully "locked" for production boundary without explicit feature-flag gating and runtime contract assertions.

### 5) Clean component boundaries / no demo-only blockers
**Status: FAIL (P1)**
- Demo-only runtime routes and overlays are intermingled in same app deployment tree.

---

## Ranked Blockers

## P0 (must fix before Tier lock)
1. **Production build broken by corrupted TSX source.**
   - `urai-tier1/src/spatial/scene/LifeMap.corrupt.1777855010.tsx` line 3 contains terminal control sequence garbage.
2. **Home invariant conflicts in active runtime path** (onboarding + HUD overlays in main scene).
   - `urai-tier1/src/spatial/scene/SpatialScene.tsx` lines 114-125.
3. **Core spatial routes include shell text/chrome not spatial-only.**
   - `urai-tier1/src/app/life-map/page.tsx` lines 8-12 (same pattern in focus/replay files).
4. **Placeholder export payload in shipped UI path.**
   - `urai-tier1/src/spatial/unity/UnityAdapterOverlay.tsx` lines 49-55.

## P1 (high priority)
1. **Public app tree contains internal/demo surfaces**, increasing leakage risk.
   - `urai-tier1/src/app/demo/**`, `src/app/internal/**`, `src/app/admin/**`, `src/app/brand-system/page.tsx`.
2. **E2E lock suite not self-contained in CI/runtime env** (Playwright browsers not provisioned).
3. **Demo fallback data semantics not fully isolated from prod behavior** (`demo-user`, `demo-fallback` usage).

## P2 (hardening)
1. Add route-level guardrails to prevent accidental exposure of internal routes in production builds.
2. Add static CI check for conflict markers and corrupt control chars in source.
3. Add invariant-enforcement tests (home must not render text/buttons/nav in lock mode).

---

## Validation commands and outcomes

- `pnpm install --frozen-lockfile` ✅
- `pnpm lint` ✅ (after fixes)
- `pnpm build` ❌ (fails due to corrupt file)
- `pnpm test:canon-lock` ✅
- `pnpm test:e2e` ⚠️ (environment missing Playwright browser binary; not app logic regression by itself)

---

## Recommended patches (minimal, lock-focused)

1. **Delete or quarantine `LifeMap.corrupt.*.tsx`** files from active compile scope.
2. **Enforce Home invariant mode** in runtime (`SpatialScene`) via lock flag that suppresses onboarding/HUD overlays on home entry.
3. **Remove or gate `SpatialShell` textual chrome** from Tier-1 lock routes (`/life-map`, `/focus`, `/replay`) in production mode.
4. **Replace Unity placeholder bundle export** with disabled control + explicit non-placeholder state OR real bundle generation.
5. **Harden build pipeline**:
   - fail CI on merge markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - fail CI on non-printable control chars in source
6. **Gate internal/demo/admin routes** behind build-time flag or separate deployment target.

---

## Tests to add

1. **Home invariant snapshot test**: asserts no text/button/nav nodes present in lock mode home render.
2. **Route exposure test**: production build should not expose `/demo`, `/internal/locks`, `/admin/invites` unless explicit flag.
3. **Corrupt-file sentinel test**: static scan for control characters and merge markers.
4. **Reduced-motion e2e**: verify no non-essential autoplay/transitions under `prefers-reduced-motion`.
5. **Mobile fullscreen lock e2e**: assert `100dvh`, no overflow scrollbars, safe-area compliance.

---

## Founder Lock Checklist (final)

- [ ] Home invariant enforced in production runtime (no text/buttons/nav/onboarding/narration on home).
- [ ] All Tier-1 core routes spatial-only; no shell/chrome leakage.
- [ ] No placeholder exports or demo payloads in production path.
- [ ] No corrupted/backup/temp scene files in compile surface.
- [ ] Full build green (`lint`, `typecheck`, `build`).
- [ ] E2E lock suite green in CI with provisioned Playwright binaries.
- [ ] Internal/demo/admin route exposure policy enforced and tested.
- [ ] Firebase/schema contracts validated against production fixtures.

