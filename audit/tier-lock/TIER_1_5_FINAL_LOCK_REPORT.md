# URAI Spatial Tier 1-5 Final Lock Report

## 1. Executive verdict

**Honest final lock statement:** Tier-1 through Tier-5 are not fully locked yet.

The 2026-05-24 continuation repaired the previous Playwright/browser blocker in a local sanitized branch archive and proved the main executable gates locally, including `pnpm lock:e2e` and `pnpm verify:release`. The remaining release-lock limitation is verification provenance: this Windows checkout was extracted from the branch archive after skipping repository entries that are illegal or too long on Windows, and it is not a native git worktree, so `pnpm migration:check` reported `No comparable git diff available; migration marker check skipped for shallow checkout.` Full remote release lock still requires the same commands to pass in a native git checkout or CI on the updated `tier-1-5-final-lock` branch.

## 2. Tier status table

| Tier | Status | Evidence | Remaining blocker |
|---|---:|---|---|
| Tier-1 foundation | Local sanitized-checkout gates passed | `check:source-integrity`, `check:production-routes`, `preflight`, `canon:check`, `canon:lock`, `locs:check`, `tier1:check`, `tier1:drift`, `home:invariant`, `firebase:rules:check`, `urai:tier1` | Native git/CI rerun still required for final release lock provenance |
| Tier-2 system canon | Local sanitized-checkout gates passed | `tier2:check`, `urai:tier2`, prior Tier-1 regression commands passed | Native git/CI rerun still required |
| Tier-3 feature canon | Local sanitized-checkout gates passed | `tier3:check`, `urai:tier3`, Tier-1 unit tests, LifeMap tests, and E2E spatial route flow passed | Native git/CI rerun still required |
| Tier-4 implementation canon | Local sanitized-checkout gates passed | `tier4:check`, `urai:tier4`, typecheck, production build, functions build/test passed | Native git/CI rerun still required |
| Tier-5 operational canon | Local sanitized-checkout gates passed | `tier5:check`, `urai:tier5`, `lock:e2e`, `verify:release` passed locally | Native git/CI rerun and branch-head CI evidence still required |

## 3. Definition of locked used

A tier is locally passed only when its canon, implementation routes, prior-tier regressions, Firebase/security checks where relevant, typecheck/build/test gates, and required smoke/E2E gates pass. Full Tier-1 through Tier-5 release lock additionally requires the same evidence from a complete git checkout or CI-protected branch run. Because this pass used a sanitized archive and one git-diff gate skipped, this report does not claim full remote release lock.

## 4. Repository state

- Target branch: `tier-1-5-final-lock`.
- Branch was fast-forwarded from `307ccf4615c10156c738407092983019b9b5e442` to current `main` head `af044ef471d3c5a0b46d9300d07499902ebfb756` before applying continuation changes.
- Local checkout source: branch zip archive extracted under Windows with path sanitization.
- Local extraction skipped 1,309 archive entries, mostly backup/audit paths with names invalid on Windows such as `*audit`.
- Package manager: pnpm 10.0.0, run through local `pnpm.cjs`.
- App framework: Next.js app router in `urai-tier1/src/app`.
- Final branch commit after report update is produced by GitHub contents API and is recorded in the chat final response.

## 5. Files audited

| Area | Files/surfaces audited |
|---|---|
| Root governance | `package.json`, `pnpm-workspace.yaml`, `.github/workflows`, `firebase.json`, Firestore rules/index files |
| Runtime boundary | `CANONICAL_RUNTIME.md`, root `src/app`, `urai-tier1/src/app`, runtime boundary scripts |
| Canon/governance | `src/canon`, `docs/canon`, tier check scripts, LOCS scripts |
| Spatial routes | `/`, `/ascent`, `/life-map`, `/focus`, `/replay`, `/unwind` |
| Replay recovery | `urai-tier1/src/app/replay/ReplayUnwindButton.tsx`, `tests/spatial-lock.mjs` |
| E2E/runtime | `scripts/check-playwright-runtime.mjs`, `scripts/playwright-runtime-helpers.mjs`, `tests/spatial-lock.mjs` |
| Tier runners | `urai-tier1/scripts/tier-lock/run-tier.mjs`, Tier-1 tests |
| Backend/security | `firebase/firestore.rules`, `apps/functions`, Firebase boundary checks |

## 6. Files changed

| File | Change |
|---|---|
| `scripts/check-home-invariant.mjs` | Updated stale home visual anchors to current scene DOM/class/testid anchors. |
| `scripts/check-lockfile-present.mjs` | Normalized Windows path separators for importer lockfile checks. |
| `scripts/canon-lock.mjs` | Pointed protected root page checks at canonical `urai-tier1/src/app/page.tsx` and suppressed noisy git stderr in archive/no-git runs. |
| `scripts/check-playwright-runtime.mjs` | Replaced brittle Windows shell `node -e` probe with `process.execPath --input-type=module`; added local pnpm entrypoint resolution. |
| `src/app/ROUTE_ARCHITECTURE.md` | Reconciled root route architecture docs with canonical runtime ownership in `urai-tier1`. |
| `tests/spatial-lock.mjs` | Added direct route coverage, robust pnpm/server startup, Windows process-tree cleanup, viewport screenshots, longer cold-route navigation timeout, ESC recovery assertion, and `/unwind` coverage. |
| `urai-tier1/scripts/tier-lock/run-tier.mjs` | Resolved pnpm via `npm_execpath` or workspace pnpm entrypoints so nested tier runners do not depend on a global pnpm binary. |
| `urai-tier1/src/app/replay/ReplayUnwindButton.tsx` | Preserved `manifestId` on Escape recovery, exposed nonvisual escape readiness, and kept click recovery to `/unwind`. |
| `urai-tier1/tests/replay-memory-theater-contract.test.mjs` | Updated replay recovery assertions to the current route contract and escape readiness marker. |
| `urai-tier1/tests/spatial-launch-boundaries.test.mjs` | Updated launch-boundary assertions to the current `buildSpatialSystemContract` wiring. |
| `audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md` | Replaced stale Playwright-blocked report with 2026-05-24 continuation evidence. |

## 7. Files deleted/quarantined

The following non-canonical root API route files were deleted locally because `CANONICAL_RUNTIME.md` identifies `urai-tier1` as the only runtime tree and `pnpm check:runtime-boundary` failed while they existed:

| Deleted file | Reason |
|---|---|
| `src/app/api/entitlement/route.ts` | Root runtime route outside canonical `urai-tier1` runtime. |
| `src/app/api/stripe/create-checkout-session/route.ts` | Root runtime route outside canonical `urai-tier1` runtime. |
| `src/app/api/stripe/webhook/route.ts` | Root runtime route outside canonical `urai-tier1` runtime. |

No generated E2E screenshots or local logs are committed.

## 8. Existing work reused/repaired/replaced/left unchanged

| Category | Summary |
|---|---|
| Reused | Existing TierOneExperience shell, LifeMap/Focus/Replay/Unwind routes, Firestore boundary checks, unit contract tests, tier runners, and CI workflow shape. |
| Repaired | Windows pnpm/runtime probing, E2E direct route coverage, cold Next route timeouts, replay ESC recovery timing, home invariant anchors, root runtime boundary leakage, nested tier runner pnpm resolution. |
| Replaced | The stale report content was replaced with current continuation evidence. No canon system was replaced. |
| Left unchanged | Current product route surfaces and provider fallback policies were left intact after passing local gates. CI workflow semantics were not weakened. |

## 9. Blockers

### P0 blockers found

- Full remote release lock still lacks native git/CI proof on the updated branch.
- The local Windows archive extraction skipped 1,309 tracked entries because of invalid or too-long Windows paths; most are backup/audit surfaces, but the repository is not fully portable to this Windows extraction path.

### P1 blockers found and fixed locally

- `pnpm lock:e2e` failed because the E2E runtime probe used `pnpm exec node -e` with Windows shell semantics.
- `pnpm lock:e2e` then hung/failed because the E2E dev server process tree stayed alive on Windows after failures.
- `pnpm lock:e2e` then failed because full-page screenshots timed out on the full-screen spatial stage.
- `pnpm lock:e2e` then failed because cold Next route compilation exceeded Playwright's default navigation timeout.
- `pnpm lock:e2e` then exposed a real ESC recovery timing issue on `/replay`; the app now marks the replay escape bridge ready before the E2E presses Escape.
- `pnpm check:runtime-boundary` failed until root non-canonical API routes were removed.
- `pnpm check:lockfile` failed on Windows path separators until path normalization was added.
- `pnpm home:invariant` failed on stale visual anchors until the current home scene anchors were used.
- `pnpm canon:check` failed in the archive because it referenced `src/app/page.tsx` instead of `urai-tier1/src/app/page.tsx`.
- Nested tier runners failed when global `pnpm` was unavailable; they now resolve the workspace pnpm entrypoint.

### P2 hardening

- Production build still emits existing warnings from Firebase/protobuf dynamic require traces and missing Next ESLint plugin detection. These warnings did not fail `next build`.
- `preflight` warns that deployment secrets are absent in this local runtime: `FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL`, `URAI_SPATIAL_FIREBASE_PROJECT_ID`, `URAI_SPATIAL_FIREBASE_WEB_CONFIG`.

### Blockers remaining

| Incomplete tier | Blocker | Failed/not-run command | File/component involved | Exact next fix | Exact next command |
|---|---|---|---|---|---|
| Tier-5 full remote release lock | Branch-head CI/native git proof is not yet recorded after these continuation commits. | `pnpm migration:check` skipped git diff in local archive; GitHub Actions status not observed here. | `scripts/check-migration-markers.mjs`, CI workflows | Run in a complete git checkout or GitHub Actions on `tier-1-5-final-lock`. | `pnpm install --no-frozen-lockfile && pnpm verify:release && pnpm lock:e2e` |
| Repo portability | Windows archive extraction skipped invalid/too-long backup/audit paths. | Full archive extraction on Windows skipped 1,309 entries. | Backup/audit path entries such as `*audit` | Delete or rename invalid Windows path entries in a Linux/native git checkout if Windows portability is a release requirement. | `git ls-files | node scripts/check-windows-path-portability.mjs` after adding such a check |

## 10. Environment blockers

- No local `git`, `pnpm`, or global `node` executable was available at start; Codex bundled Node and a downloaded local pnpm 10.0.0 entrypoint were used.
- The local verification path is a sanitized branch archive, not a native `.git` checkout.
- Playwright Chromium is now installed and launchable locally; the previous browser install/launch blocker is fixed for this environment.

## 11. Architecture map summary

| System | Classification after continuation |
|---|---|
| Tier-1 identity/foundation | Implemented, locally tested, native git/CI proof pending |
| Tier-2 system canon | Implemented, locally tested, native git/CI proof pending |
| Tier-3 feature canon | Implemented, locally tested with E2E route flow, native git/CI proof pending |
| Tier-4 implementation canon | Implemented, typechecked/built locally, native git/CI proof pending |
| Tier-5 operational canon | Implemented and locally release-verified, branch-head CI proof pending |
| Spatial runtime | Implemented and E2E-rendered locally |
| LifeMap / Focus / Replay / Unwind | Implemented and covered by E2E screenshots/assertions |
| Privacy / Consent / Data licensing | Existing rules/tests passed locally through Firebase and unit gates |
| Firebase/backend | Firestore checks and functions build/test passed locally |
| CI | Workflows exist; branch-head run not observed in this continuation |
| Playwright | Local install and E2E pass confirmed |
| Release artifacts | Report updated; screenshots generated locally under `artifacts/spatial-lock` |

## 12. UI/UX and route coverage table

| Route | Owner tier/system | Entrypoint | Local evidence |
|---|---|---|---|
| `/` | Tier-1 Spatial | `TierOneExperience mode="home"` | E2E screenshot `01-home-sky-only-desktop.png`; no console errors |
| `/ascent` | Tier-1/Tier-3 transition | `TierOneExperience mode="ascent"` | E2E screenshot `02-ascent-desktop.png` |
| `/life-map` | Tier-3 Memory/Spatial | `TierOneExperience mode="life-map"` | Desktop and mobile E2E screenshots; bounding-box mobile check |
| `/focus` | Tier-3 Focus/Cognitive Mirror | `TierOneExperience mode="focus"` | E2E screenshot `04-focus-desktop.png`; action panel asserted |
| `/replay` | Tier-3 Replay/Storytime | `TierOneExperience mode="replay"` | E2E screenshot `05-replay-desktop.png`; escape bridge readiness asserted |
| `/unwind` | Tier-3 recovery/Emotional OS | `TierOneExperience mode="unwind"` | E2E screenshot `05b-unwind-desktop.png`; recovery guidance asserted |
| `/admin`, `/internal`, `/demo` | Tier-5/protected demo surfaces | Existing route gates | `check:production-routes` passed locally |

## 13. Spatial interaction coverage table

| Interaction | Evidence | Status |
|---|---|---|
| First load | `pnpm lock:e2e`, `01-home-sky-only-desktop.png` | Passed locally |
| Home to ascent | `tests/spatial-lock.mjs` direct `/ascent` route | Passed locally |
| Life Map route | `03-lifemap-desktop.png`, `07-lifemap-mobile.png` | Passed locally |
| Focus route | `04-focus-desktop.png` and focus action panel assertion | Passed locally |
| Replay route | `05-replay-desktop.png` and replay stage assertion | Passed locally |
| Replay ESC recovery | `05a-escape-recovery-focus-desktop.png` | Passed locally |
| Unwind recovery | `05b-unwind-desktop.png` | Passed locally |
| Console/hydration | E2E collected browser console errors | Passed locally with empty console error list |
| Mobile viewport | 390x844 viewport and stage bounds check | Passed locally |

## 14. Mobile/responsive and accessibility coverage

| Area | Evidence |
|---|---|
| Mobile portrait | `pnpm lock:e2e` checked 390x844 LifeMap stage height and width |
| Desktop | `pnpm lock:e2e` checked 1440x1000 route screenshots |
| Reduced motion | Existing static/unit coverage preserved; production build passed |
| Keyboard recovery | Replay Escape recovery asserted in E2E; LifeMap/focus tests passed |
| Screen-reader/control labels | Replay unwind button keeps `aria-label="Unwind replay safely"`; unit contract passed |
| Overlay/pointer traps | E2E route progression completed without stranding and without console errors |

## 15. Firebase/security coverage table

| Area | Evidence | Status |
|---|---|---|
| Firestore rules/boundaries | `pnpm firebase:rules:check` | Passed locally |
| Functions build | `pnpm --filter urai-functions build` | Passed locally |
| Functions tests | `pnpm --filter urai-functions test` | Passed locally |
| Admin/internal exposure | `pnpm check:production-routes` | Passed locally |
| Demo fallback isolation | Tier-1 unit tests and Firebase boundary checks | Passed locally |
| Secrets | No secrets added; preflight warns local deployment secrets are absent | Safe local warning |

## 16. CI coverage table

| Required gate | Status |
|---|---|
| install | Present in workflows; local install passed |
| lockfile/source integrity | Present; local checks passed |
| production route exposure | Present; local check passed |
| preflight | Present; local command passed with missing-secret warnings |
| canon/LOCS checks | Present; local checks passed |
| Tier-1 through Tier-5 governance | Present; local tier checks passed |
| Firebase rules/config | Present; local rule check passed |
| unit/LifeMap tests | Present; local tests passed |
| production build | Present; local build passed |
| Playwright install/runtime | Present; local runtime ensured |
| E2E lock | Present; local `lock:e2e` passed |
| artifact upload | Present in CI workflows; local screenshots generated |

## 17. E2E coverage table

| Requirement | Evidence |
|---|---|
| App loads | `pnpm lock:e2e` passed |
| Critical routes render | `/`, `/ascent`, `/life-map`, `/focus`, `/replay`, `/unwind` asserted |
| Spatial flow works | Direct route flow, replay Escape recovery, unwind recovery asserted |
| No console errors | `visual-audit-report.json` has `"console": []` |
| Mobile viewport path | `07-lifemap-mobile.png` and bounding-box assertion |
| Route guards/internal exposure | `check:production-routes` passed |
| No user-stranding state | E2E reached final mobile LifeMap state and closed browser |

## 18. Command evidence table

| Command | Result |
|---|---:|
| `pnpm install --no-frozen-lockfile --reporter append-only` | PASS |
| `pnpm playwright:ensure` | PASS |
| `pnpm lock:e2e` | PASS |
| `pnpm verify:release` | PASS |
| `pnpm check:lockfile` | PASS |
| `pnpm check:source-integrity` | PASS |
| `pnpm check:production-routes` | PASS |
| `pnpm preflight` | PASS with local missing-secret warnings |
| `pnpm canon:check` | PASS |
| `pnpm canon:lock` | PASS |
| `pnpm locs:check` | PASS |
| `pnpm tier1:check` | PASS |
| `pnpm tier1:drift` | PASS |
| `pnpm home:invariant` | PASS |
| `pnpm firebase:rules:check` | PASS |
| `pnpm test:canon` | PASS |
| `pnpm --filter urai-tier1 typecheck` | PASS |
| `pnpm --filter urai-tier1 test` | PASS, 61/61 |
| `pnpm --filter urai-tier1 test:lifemap` | PASS |
| `pnpm --filter urai-functions build` | PASS |
| `pnpm --filter urai-functions test` | PASS |
| `pnpm tier2:check` | PASS |
| `pnpm tier3:check` | PASS |
| `pnpm tier4:check` | PASS |
| `pnpm tier5:check` | PASS |
| `pnpm urai:tier1` | PASS |
| `pnpm urai:tier2` | PASS |
| `pnpm urai:tier3` | PASS |
| `pnpm urai:tier4` | PASS |
| `pnpm urai:tier5` | PASS |

## 19. Exact commands run

```powershell
pnpm install --no-frozen-lockfile --reporter append-only
pnpm playwright:ensure
pnpm lock:e2e
pnpm verify:release
pnpm check:lockfile
pnpm check:source-integrity
pnpm check:production-routes
pnpm preflight
pnpm canon:check
pnpm canon:lock
pnpm locs:check
pnpm tier1:check
pnpm tier1:drift
pnpm home:invariant
pnpm firebase:rules:check
pnpm test:canon
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 test
pnpm --filter urai-tier1 test:lifemap
pnpm --filter urai-functions build
pnpm --filter urai-functions test
pnpm tier2:check
pnpm tier3:check
pnpm tier4:check
pnpm tier5:check
pnpm urai:tier1
pnpm urai:tier2
pnpm urai:tier3
pnpm urai:tier4
pnpm urai:tier5
```

Commands were executed through Codex bundled Node plus the local pnpm 10.0.0 entrypoint because global `pnpm` was unavailable.

## 20. Tier evidence

| Tier | Evidence |
|---|---|
| Tier-1 | Source integrity, production routes, preflight, canon, LOCS, Tier-1 check, drift, home invariant, Firebase boundary, typecheck, unit, build-backed `urai:tier1` all passed locally |
| Tier-2 | `tier2:check` and `urai:tier2` passed after Tier-1 regression |
| Tier-3 | `tier3:check`, `urai:tier3`, LifeMap tests, replay route contract test, and E2E spatial flow passed |
| Tier-4 | `tier4:check`, `urai:tier4`, typecheck, production build, Firebase/functions checks passed |
| Tier-5 | `tier5:check`, `urai:tier5`, `verify:release`, and `lock:e2e` passed locally |

## 21. Regression check evidence

Post-fix regression sweep passed every command listed in section 18. `pnpm verify:release` also passed after static checks, typecheck, production build, Playwright runtime ensure, and E2E.

## 22. Final git status at report write time

Local shell has no native git checkout. GitHub connector evidence:

- `tier-1-5-final-lock` was fast-forwarded to `af044ef471d3c5a0b46d9300d07499902ebfb756`.
- Continuation files are applied to `tier-1-5-final-lock` through GitHub contents API after local verification.
- Final branch compare and final commit hash are recorded in the chat final response after the report update commit is created.

## 23. Final commit message

Primary continuation commit message used through the contents API:

`lock: harden final tier e2e verification`

Report update commit message:

`audit: update tier 1-5 final lock evidence`

## 24. Exact next command

Run this in a complete native git checkout or GitHub Actions on `tier-1-5-final-lock`:

```bash
pnpm install --no-frozen-lockfile && pnpm verify:release && pnpm lock:e2e
```

## 25. Safe to expand?

No. Expansion beyond Tier-5 is not safe until the updated branch has native git/CI evidence for the same passing gates recorded here and the skipped Windows-invalid archive path issue is either remediated or explicitly accepted as non-release-blocking for the target deployment environment.
