# URAI Spatial Tier 1-5 Final Lock Report

## 1. Executive verdict

**Honest final lock statement:** Tier-1 through Tier-5 are not fully locked yet.

The repository now has stronger Tier-3, Tier-4, and Tier-5 canon exports, an `/unwind` production route, CI launch-lock gates, mobile safe-area handling, and expanded route/E2E coverage. Static, canon, Firebase, unit, LifeMap, typecheck, production build, functions build/test, and tier runner gates passed locally. Full release lock remains incomplete because Playwright Chromium could not be installed or launched in this environment: both the Playwright CDN and Ubuntu apt repositories returned HTTP 403 responses.

## 2. Tier status table

| Tier | Status | Evidence | Blocker |
|---|---:|---|---|
| Tier-1 foundation | Passed local gate | `pnpm tier1:check`, `pnpm tier1:drift`, `pnpm home:invariant`, `pnpm firebase:rules:check` passed. | None found locally. |
| Tier-2 system canon | Passed local gate | `pnpm tier2:check`, `pnpm urai:tier2` passed. | None found locally. |
| Tier-3 feature canon | Passed local gate | `pnpm tier3:check`, `pnpm urai:tier3`, unit/LifeMap tests passed; `/unwind` route added. | Full lock blocked by Playwright E2E environment failure. |
| Tier-4 implementation canon | Passed local gate | `pnpm tier4:check`, `pnpm urai:tier4`, typecheck and production build passed. | Full lock blocked by Playwright E2E environment failure. |
| Tier-5 operational canon | Incomplete for full release | `pnpm tier5:check`, `pnpm urai:tier5`, functions build/test passed; CI gates repaired. | `pnpm verify:release` failed at `pnpm lock:e2e`; Playwright Chromium download/install blocked by HTTP 403. |

## 3. Definition of locked used

A tier is considered locally passed only when its source-of-truth canon exists, routes/components are wired where applicable, prior tier regression checks pass, Firebase/security checks pass where applicable, production build passes where applicable, and evidence is recorded. Full Tier-1 through Tier-5 release lock additionally requires Playwright E2E to pass. Because E2E did not run successfully, full release lock is not claimed.

## 4. Repository state

- Current branch: tier-1-5-final-lock
- Commit hash before work: c27640d16c2e7a59031ec184bd6f57454c3bf160
- Commit hash after work: 292e8eb440b4b53ef752131d8841cc61662809d1
- Package manager: pnpm, pinned in `package.json`
- App framework: Next.js app router in `urai-tier1/src/app`
- Workspace packages audited: root workspace, `urai-tier1`, `apps/functions`, `packages/tier-locks`

## 5. Files audited

- Root governance: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/*`, `firebase.json`, `firebase/firestore.rules`, `firebase/firestore.indexes.json`.
- Canon/governance: `src/canon/*`, `docs/canon/*`, `.canon-migration/*`, `scripts/check-*`, `scripts/preflight.mjs`, `scripts/canon-lock.mjs`.
- App routes: `urai-tier1/src/app/page.tsx`, `/home`, `/life-map`, `/focus`, `/replay`, `/unwind`, `/mirror`, `/admin/invites`, `/internal/locks`, `/demo`, `/privacy`, `/terms`, API routes.
- Spatial/UI: `TierOneExperience.tsx`, `HomeScene.tsx`, `SpatialVisualOverlayTier5.tsx`, `LifeMapScene.tsx`, `globals.css`, home visual scene, LifeMap tests.
- Backend/security: `apps/functions`, Firestore rules/indexes, entitlement/Stripe API surfaces.
- Tests/E2E: `urai-tier1/tests/*`, `tests/spatial-lock.mjs`, `tests/spatial-tier-lock-hardening.mjs`, `tests/replay-tier5-lock.mjs`.

## 6. Files changed

- Added Tier-3 feature canon entries for home, Life Map, focus, replay, and unwind.
- Added Tier-4 implementation canon entries for route integrity, console hygiene, reduced motion, Firebase boundaries, and env readiness.
- Added Tier-5 operational canon entries for CI, Playwright E2E, release reporting, rollback/incident response, and artifacts.
- Added root `tier3:check`, `tier4:check`, and `tier5:check` scripts and governance check implementations.
- Added `/unwind` route and wired HomeScene/TierOneExperience/visual overlay support.
- Expanded spatial E2E coverage text for direct `/focus`, `/replay`, and `/unwind` routes and replay-to-unwind recovery.
- Updated launch CI to include source integrity, production-route exposure, preflight, canon/LOCS, Firebase boundary, tier gates, Playwright install, E2E, and artifact upload.
- Updated environment readiness audit to read local and root env examples for declared required keys while still warning on optional vendor keys.
- Added safe-area CSS variables and mobile-safe placement.
- Added final canon migration marker for the Tier 1-5 lock pass.

## 7. Files deleted/quarantined

No files were deleted or quarantined. Pre-existing modified files outside the staged lock work were documented and left unchanged unless directly required by package/governance changes.

## 8. Existing work reused/repaired/replaced/left unchanged

| Category | Summary |
|---|---|
| Reused | Existing TierOneExperience shell, HomeScene spatial runtime, Firestore boundary checks, route audits, tier runner scripts, Playwright lock tests, CI workflows. |
| Repaired | Missing root tier check scripts, stale pnpm preflight pin check, runtime/home invariant checks for the new unwind route, CI launch gate coverage, env readiness discovery, ESM named export test runtime behavior. |
| Replaced | No canon system was replaced; Tier-3 through Tier-5 exports were expanded in place. |
| Left unchanged | Existing legacy/archive/audit folders and pre-existing lockfile backup diffs were not normalized in this pass to avoid unrelated destructive changes. |

## 9. Blockers

### P0 blockers found

- Playwright Chromium browser was absent locally and could not be downloaded from the Playwright CDN due HTTP 403.
- Ubuntu apt repositories also returned HTTP 403, so system Chromium could not be installed as a fallback.

### P1 blockers found

- Root tier3/tier4/tier5 check scripts were missing.
- `/unwind` was required by the lock contract but absent as a production route.
- Launch CI did not include all required static/preflight/canon/Firebase gates before the tier lock sequence.
- The local env readiness audit did not inspect env example files from the workspace root.

### P2 hardening found

- Mobile safe-area variables were absent from the global CSS baseline.
- Existing test runtime needed ESM package metadata to expose named TypeScript exports consistently.

### Blockers fixed

- Missing tier check scripts, Tier-3/4/5 canon entries, `/unwind` route wiring, CI gate coverage, preflight package-manager drift, runtime/home invariant checks, env example discovery, mobile safe-area CSS, and unit test export/runtime failures.

### Blockers remaining

| Incomplete tier | Blocker | Failed command | File/component involved | Exact next fix | Exact next command |
|---|---|---|---|---|---|
| Tier-5 full release lock | Playwright Chromium cannot install/launch in this environment because CDN and apt downloads return HTTP 403. | `pnpm verify:release` at `pnpm lock:e2e`; `pnpm playwright:install`; `apt-get update && apt-get install -y chromium` | `scripts/check-playwright-runtime.mjs`, `tests/spatial-lock.mjs` | Run in CI/developer environment with Playwright CDN or system package access, or provide a preinstalled Chromium executable and wire Playwright to it. | `pnpm playwright:install && pnpm verify:release && pnpm lock:e2e` |

## 10. Environment blockers

- `pnpm playwright:install` failed with `server returned code 403 body 'Forbidden'` for `https://cdn.playwright.dev/builds/cft/147.0.7727.15/linux64/chrome-linux64.zip`.
- `apt-get update && apt-get install -y chromium` failed with HTTP 403 responses from Ubuntu apt repositories via proxy.
- App logic is not implicated by this blocker because typecheck, unit tests, LifeMap tests, tier runners, production build, Firebase boundary checks, and functions checks all passed before E2E attempted to launch a missing browser.

## 11. Architecture map summary

| System | Classification |
|---|---|
| Tier-1 identity/foundation | Implemented, tested, local gate passed. |
| Tier-2 system canon | Implemented, tested, local gate passed. |
| Tier-3 feature canon | Implemented and tested locally; full release blocked by E2E environment. |
| Tier-4 implementation canon | Implemented and build-tested; full release blocked by E2E environment. |
| Tier-5 operational canon | Implemented with CI/reporting; full release incomplete because E2E cannot launch. |
| Spatial runtime | Implemented; `/`, `/life-map`, `/focus`, `/replay`, `/unwind` wired. |
| LifeMap | Implemented and unit-tested. |
| Focus | Implemented and route-tested. |
| Replay | Implemented and route-tested. |
| Unwind | Implemented as safe recovery route. |
| Memory/Storytime/Scrolls/Rituals/Companion/Council/Narrator/Cognitive Mirror/Emotional OS/Symbolic OS | Represented in canon/system boundaries; existing feature surfaces preserved. |
| Privacy/Consent/Data licensing | Firestore/admin/demo boundaries checked locally. |
| Firebase/backend | Rules/config/functions checks passed locally. |
| CI | Launch pipeline repaired to include required gates. |
| Playwright | Tests present but browser install/launch blocked by environment. |
| Release artifacts | Final report exists; E2E artifacts not generated because browser could not launch. |

## 12. UI/UX and route coverage table

| Route | Owner tier/system | Entrypoint | Loading/empty/error/success | Mobile/reduced motion/accessibility | Status |
|---|---|---|---|---|---|
| `/` | Tier-1 Spatial | `TierOneExperience mode="home"` | App loading/error/not-found present | Silent home invariant, reduced motion, safe-area CSS | Local gate passed |
| `/life-map` | Tier-3 Memory/Spatial | `TierOneExperience mode="life-map"` | Route card and LifeMap states | Keyboard/ESC path, mobile safe-area | Local gate passed |
| `/focus` | Tier-3 Cognitive Mirror | `TierOneExperience mode="focus"` | Focus/empty fallback panels | Replay/back buttons and labels | Local gate passed |
| `/replay` | Tier-3 Storytime | `TierOneExperience mode="replay"` | Replay panel and safe fallback | ESC to focus and Unwind button | Local gate passed |
| `/unwind` | Tier-3 Emotional OS | `TierOneExperience mode="unwind"` | Safe recovery route | ESC/home recovery path and live guidance | Local gate passed |
| `/mirror` | Tier-3 Cognitive Mirror | `TierOneExperience mode="mirror"` | Reflection layer | Back to Home/LifeMap actions | Existing local gate passed |
| `/admin/invites`, `/internal/locks`, `/demo/*` | Tier-2/5 admin/demo | Existing routes | Production route exposure checked | Exposure gate passed | Local gate passed |

## 13. Spatial interaction coverage table

| Interaction | Evidence | Status |
|---|---|---|
| First load | Home invariant and production build passed. | Passed local static/build gates |
| Home to Life Map | HomeScene route transition checked by tests. | Passed local tests |
| Life Map to Focus | LifeMap route/test coverage passed. | Passed local tests |
| Focus to Replay | Focus panel/unit route tests passed. | Passed local tests |
| Replay to Unwind | Unwind route/button added and E2E script updated. | Browser execution blocked |
| ESC/back recovery | HomeScene/unit tests passed; E2E script updated. | Browser execution blocked for final proof |
| Mobile viewport | Safe-area CSS added; E2E mobile script present. | Browser execution blocked |
| Reduced motion | CSS/test checks passed; E2E reduced-motion browser proof blocked. | Browser execution blocked |
| Console/hydration | Console audit static runner passed; browser console proof blocked. | Browser execution blocked |

## 14. Firebase/security coverage table

| Area | Evidence | Status |
|---|---|---|
| Firestore rules | `pnpm firebase:rules:check` passed. | Passed |
| Functions build/test | `pnpm --filter urai-functions build`, `pnpm --filter urai-functions test` passed. | Passed |
| Admin/internal exposure | `pnpm check:production-routes` passed and CI includes it. | Passed local gate |
| Demo fallback isolation | Existing tests and Firestore launch-demo boundary preserved. | Passed local tests |
| Secrets | No secret files intentionally added; pre-existing `.env.local` was not modified. | Audited |

## 15. CI coverage table

| Required gate | CI status |
|---|---|
| install | Present |
| lockfile/source integrity | Present |
| production route exposure | Present |
| preflight | Present |
| canon/LOCS checks | Present |
| Tier-1 through Tier-5 checks | Present |
| Firebase rules/config check | Present |
| build | Present through tier runners/release lock |
| Playwright install | Present |
| E2E lock | Present |
| artifact upload | Present |

## 16. E2E coverage table

| Requirement | Script coverage | Runtime status |
|---|---|---|
| App loads and critical routes render | `tests/spatial-lock.mjs` | Browser blocked |
| `/`, `/life-map`, `/focus`, `/replay`, `/unwind` | `tests/spatial-lock.mjs` route literals/checks | Browser blocked |
| Home → Life Map → Focus → Replay → Unwind/back | `tests/spatial-lock.mjs` updated | Browser blocked |
| No console/hydration errors | Console collection in `tests/spatial-lock.mjs` | Browser blocked |
| Mobile viewport | `tests/spatial-lock.mjs` | Browser blocked |
| Reduced motion | Existing scripts/gates; browser proof blocked | Browser blocked |
| Internal/debug exposure | Production route gate passed; browser proof blocked | Partial local static pass |

## 17. Command evidence table

| Command | Result |
|---|---:|
| `pnpm install --no-frozen-lockfile` | PASS |
| `pnpm check:lockfile` | PASS |
| `pnpm check:source-integrity` | PASS |
| `pnpm check:production-routes` | PASS |
| `pnpm preflight` | PASS |
| `pnpm canon:check` | PASS |
| `pnpm canon:lock` | PASS |
| `pnpm locs:check` | PASS |
| `pnpm tier1:check` | PASS |
| `pnpm tier1:drift` | PASS |
| `pnpm home:invariant` | PASS |
| `pnpm firebase:rules:check` | PASS |
| `pnpm test:canon` | PASS |
| `pnpm --filter urai-tier1 typecheck` | PASS |
| `pnpm --filter urai-tier1 test` | PASS |
| `pnpm --filter urai-tier1 test:lifemap` | PASS |
| `pnpm --filter urai-tier1 build` | PASS |
| `pnpm tier2:check` | PASS |
| `pnpm tier3:check` | PASS |
| `pnpm tier4:check` | PASS |
| `pnpm tier5:check` | PASS |
| `pnpm urai:tier1` | PASS |
| `pnpm urai:tier2` | PASS |
| `pnpm urai:tier3` | PASS |
| `pnpm urai:tier4` | PASS |
| `pnpm urai:tier5` | PASS |
| `pnpm --filter urai-functions build` | PASS |
| `pnpm --filter urai-functions test` | PASS |
| `pnpm verify:release` | FAIL: blocked at Playwright browser launch/download |
| `pnpm lock:e2e` | FAIL via same Playwright browser launch/download path |
| `pnpm playwright:install` | FAIL: Playwright CDN HTTP 403 |
| `apt-get update && apt-get install -y chromium` | FAIL: apt repositories HTTP 403 |

## 18. Exact commands run

See the command evidence table above. Logs were captured under `artifacts/agent-command-logs/` during this session, but only this report is committed as durable release evidence.

## 19. Tier evidence

- Tier-1 evidence: source integrity, production routes, preflight, canon, LOCS, Tier-1 check, drift, home invariant, Firebase boundary, typecheck, test, build, and `urai:tier1` passed before release verification attempted E2E.
- Tier-2 evidence: Tier-1 regression checks remained passing; `pnpm tier2:check` and `pnpm urai:tier2` passed.
- Tier-3 evidence: Tier-1/Tier-2 regression checks remained passing; `pnpm tier3:check`, `pnpm urai:tier3`, app unit tests, LifeMap tests, and route wiring passed locally; full proof blocked by E2E environment.
- Tier-4 evidence: Tier-1 through Tier-3 regression checks remained passing; `pnpm tier4:check`, `pnpm urai:tier4`, typecheck, production build, Firebase checks, and functions checks passed locally.
- Tier-5 evidence: Tier-1 through Tier-4 regression checks remained passing; `pnpm tier5:check`, `pnpm urai:tier5`, CI gate inspection, functions build/test passed; `pnpm verify:release` failed at E2E due environment.

## 20. Regression check evidence

The final full run progressed through all static, canon, Firebase, unit, LifeMap, build, tier, and functions commands successfully before `pnpm verify:release` failed at Playwright launch. Therefore the remaining blocker is isolated to browser acquisition/launch for E2E.

## 21. Final git status at report write time

Git status is recorded outside this report immediately before commit. Pre-existing modified lockfile/backup lockfile changes were present before this task and are not part of the lock implementation intent.

## 22. Final commit message

Because full release lock is blocked by environment-only Playwright/apt HTTP 403 failures, the commit message is:

`audit: document URAI Spatial tier 1-5 lock blockers`

## 23. Final commit hash

292e8eb440b4b53ef752131d8841cc61662809d1

## 24. Exact next command for future contributor

```bash
pnpm playwright:install && pnpm verify:release && pnpm lock:e2e
```

If the Playwright CDN remains unavailable, run in CI with browser cache access or provide a preinstalled Chromium path and then run:

```bash
pnpm verify:release && pnpm lock:e2e
```

## 25. Safe to expand?

No. It is not safe to proceed to expansion until `pnpm verify:release` and `pnpm lock:e2e` pass with Playwright Chromium available.
