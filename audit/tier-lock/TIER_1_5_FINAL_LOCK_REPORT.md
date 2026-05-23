# URAI Spatial Tier 1-5 Final Lock Report

## 1. Executive verdict

**Honest final lock statement:** Tier-1 through Tier-5 are not fully locked yet.

The repository has stronger Tier-3, Tier-4, and Tier-5 canon exports, an `/unwind` production route, CI launch-lock gates, mobile safe-area handling, and expanded route/E2E coverage. Static, canon, Firebase, unit, LifeMap, typecheck, production build, functions build/test, and tier runner gates were previously recorded as passing locally. Full release lock remains incomplete because Playwright Chromium could not be installed or launched in the prior verification environment: both the Playwright CDN and Ubuntu apt repositories returned HTTP 403 responses.

This 2026-05-22 addendum refreshed branch governance: `tier-1-5-final-lock` was reset from its stale 733-commit-behind state to current `main`, then the launch/spatial CI lock protections were re-applied as two targeted commits. No production source route/component changes were made in this addendum.

## 2. Tier status table

| Tier | Status | Evidence | Blocker |
|---|---:|---|---|
| Tier-1 foundation | Passed prior local gate; not re-run in this network-limited shell | `pnpm tier1:check`, `pnpm tier1:drift`, `pnpm home:invariant`, `pnpm firebase:rules:check` were recorded as passed in the existing report. | Current shell cannot clone GitHub over DNS, so commands were not re-run here. |
| Tier-2 system canon | Passed prior local gate; not re-run in this network-limited shell | `pnpm tier2:check`, `pnpm urai:tier2` were recorded as passed. | Current shell cannot clone GitHub over DNS, so commands were not re-run here. |
| Tier-3 feature canon | Passed prior local gate; full lock still blocked | `pnpm tier3:check`, `pnpm urai:tier3`, unit/LifeMap tests passed previously; `/unwind` route exists on current `main`. | Full lock blocked until Playwright E2E passes. |
| Tier-4 implementation canon | Passed prior local gate; full lock still blocked | `pnpm tier4:check`, `pnpm urai:tier4`, typecheck and production build passed previously. | Full lock blocked until Playwright E2E passes. |
| Tier-5 operational canon | Improved in this addendum; incomplete for full release | CI launch and spatial workflows now protect `tier-1-5-final-lock`, include explicit Tier 1-5 governance checks, and run full release verification after E2E. | `pnpm verify:release` / `pnpm lock:e2e` must pass in CI or a browser-enabled local environment. |

## 3. Definition of locked used

A tier is considered locally passed only when its source-of-truth canon exists, routes/components are wired where applicable, prior tier regression checks pass, Firebase/security checks pass where applicable, production build passes where applicable, and evidence is recorded. Full Tier-1 through Tier-5 release lock additionally requires Playwright E2E to pass. Because E2E has not been successfully re-run and proven on the current branch, full release lock is not claimed.

## 4. Repository state

- Current branch: `tier-1-5-final-lock`
- Base before addendum: branch was 2 commits ahead and 733 commits behind `main`.
- Addendum branch action: force-updated `tier-1-5-final-lock` to current `main` commit `6158cd35845a9491ed854f144d451f8fecca5601`, then re-applied two CI/governance commits.
- Commit hash after addendum: `ba8e696823b4f59d3f143a8e882596fe64c830de`
- Current compare state after addendum: branch is 2 commits ahead of `main`, 0 commits behind.
- Package manager: pnpm, pinned in `package.json`.
- App framework: Next.js app router in `urai-tier1/src/app`.
- Workspace packages audited previously: root workspace, `urai-tier1`, `apps/functions`, `packages/tier-locks`.

## 5. Files audited

- Root governance: `package.json`, `pnpm-workspace.yaml`, `.github/workflows/urai-launch.yml`, `.github/workflows/urai-spatial-ci.yml`, `firebase.json`, `firebase/firestore.rules`, `firebase/firestore.indexes.json`.
- Repo purpose docs: `README.md`, `REPO_PURPOSE.md`.
- Existing final lock artifact: `audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md`.
- Prior audit scope preserved from the existing report: `src/canon/*`, `docs/canon/*`, scripts, app routes, spatial/UI components, backend/security files, and E2E tests.

## 6. Files changed

Addendum changes:

- `.github/workflows/urai-launch.yml`
  - Added `tier-1-5-final-lock` to push triggers.
  - Added explicit `pnpm tier1:check && pnpm tier2:check && pnpm tier3:check && pnpm tier4:check && pnpm tier5:check` governance gate before tier runner jobs.
  - Added `pnpm verify:release` after `pnpm lock:e2e` so the launch workflow verifies the full release aggregate, not only the E2E runner.
- `.github/workflows/urai-spatial-ci.yml`
  - Set workflow dispatch default verification ref to `tier-1-5-final-lock`.
  - Added `tier-1-5-final-lock` to push triggers.
  - Replaced repeated Tier-1-only aggregate lock steps in the workspace and tier1 jobs with full Tier 1-5 governance checks while preserving Tier-1 drift, home invariant, Firebase, LOCS, unit, LifeMap, typecheck, build, functions, Firebase config, and E2E jobs.
- `audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md`
  - Updated to record the branch refresh, addendum commits, current verification limitations, and exact next command.

Prior implementation changes already present on `main` and preserved:

- Tier-3/4/5 canon entries.
- `/unwind` route and spatial recovery wiring.
- Expanded spatial E2E coverage.
- Environment readiness audit improvements.
- Safe-area CSS and mobile hardening.

## 7. Files deleted/quarantined

No files were deleted or quarantined in this addendum.

## 8. Existing work reused/repaired/replaced/left unchanged

| Category | Summary |
|---|---|
| Reused | Current `main` implementation, existing TierOneExperience shell, spatial runtime, Firestore boundary checks, route audits, tier runner scripts, Playwright lock tests, and CI workflows. |
| Repaired | Stale `tier-1-5-final-lock` branch state; missing branch push protection in launch/spatial CI; missing explicit Tier 1-5 governance gate in launch CI; missing full `verify:release` in the launch workflow. |
| Replaced | The stale branch tip was replaced with current `main` before targeted CI changes were re-applied. No source canon system was replaced. |
| Left unchanged | App source files and tests were not modified in this addendum because the current blocker is verification infrastructure/branch governance, not a newly discovered route/component defect. |

## 9. Blockers

### P0 blockers found

- Full release lock remains blocked until Playwright E2E can be installed/launched and `pnpm verify:release` passes.
- This shell could not clone the repository from GitHub because `github.com` DNS resolution failed; therefore no shell-based `pnpm` commands were run in this addendum.

### P1 blockers found

- The branch requested by the lock contract existed but was stale by 733 commits relative to `main`.
- The current `main` launch pipeline did not run on `tier-1-5-final-lock`, did not include an explicit Tier 1-5 governance check step, and did not run `pnpm verify:release` after E2E.
- The current `main` spatial CI workflow did not run on pushes to `tier-1-5-final-lock` and defaulted manual verification to `main`.

### P2 hardening found

- Node version remains `20` in the two updated workflows to preserve current `main` behavior even though README/runtime docs mention Node 22+. This should be reconciled only after confirming CI compatibility.

### Blockers fixed

- Refreshed `tier-1-5-final-lock` to current `main`.
- Re-applied final branch CI protection.
- Added launch-workflow Tier 1-5 governance gate and `verify:release` aggregate gate.
- Updated spatial CI dispatch/push target and Tier 1-5 governance coverage.

### Blockers remaining

| Incomplete tier | Blocker | Failed/not-run command | File/component involved | Exact next fix | Exact next command |
|---|---|---|---|---|---|
| Tier-5 full release lock | Playwright E2E has not passed on the refreshed branch. | `pnpm verify:release`, `pnpm lock:e2e` not re-run in this shell because repo clone failed with DNS resolution error. Prior report records Playwright CDN/apt HTTP 403 failures. | `scripts/check-playwright-runtime.mjs`, `tests/spatial-lock.mjs`, CI workflows | Run the refreshed branch in GitHub Actions or a local environment with GitHub + Playwright browser access. | `pnpm install --no-frozen-lockfile && pnpm verify:release && pnpm lock:e2e` |

## 10. Environment blockers

- Current shell blocker: `git clone https://github.com/LifeLoggerAI/urai-spatial.git` failed with `Could not resolve host: github.com`.
- Prior verification blocker preserved from the existing report: Playwright Chromium download/install was blocked by HTTP 403 from the CDN/apt path.
- App logic is not implicated by the current shell blocker; the only changes made through the GitHub connector are workflow/report changes.

## 11. Architecture map summary

| System | Classification |
|---|---|
| Tier-1 identity/foundation | Implemented in repo; prior local gate recorded as passed; not re-run in this addendum. |
| Tier-2 system canon | Implemented in repo; prior local gate recorded as passed; not re-run in this addendum. |
| Tier-3 feature canon | Implemented in repo; full release blocked by E2E proof. |
| Tier-4 implementation canon | Implemented in repo; full release blocked by E2E proof. |
| Tier-5 operational canon | Improved in this addendum; CI now covers the final branch and aggregate release gate. |
| Spatial runtime | Existing implementation preserved. |
| LifeMap / Focus / Replay / Unwind | Existing current-main implementation preserved. |
| Privacy / Consent / Data boundaries | Existing current-main implementation preserved. |
| Firebase/backend | Existing current-main implementation preserved. |
| CI | Repaired for final branch lock coverage. |
| Playwright | Required for final lock; not run in this addendum. |
| Release artifacts | This report updated; E2E artifacts still require a browser-enabled run. |

## 12. UI/UX and route coverage table

| Route | Owner tier/system | Entrypoint | Status |
|---|---|---|---|
| `/` | Tier-1 Spatial | `TierOneExperience mode="home"` | Existing implementation preserved; not browser-tested in addendum. |
| `/life-map` | Tier-3 Memory/Spatial | `TierOneExperience mode="life-map"` | Existing implementation preserved; not browser-tested in addendum. |
| `/focus` | Tier-3 Cognitive Mirror | `TierOneExperience mode="focus"` | Existing implementation preserved; not browser-tested in addendum. |
| `/replay` | Tier-3 Storytime | `TierOneExperience mode="replay"` | Existing implementation preserved; not browser-tested in addendum. |
| `/unwind` | Tier-3 Emotional OS | `TierOneExperience mode="unwind"` | Existing implementation preserved; not browser-tested in addendum. |
| `/privacy`, `/terms`, `/spatial`, `/u/adamclamp` | Spatial/privacy/demo surfaces | Existing routes | Existing implementation preserved; not browser-tested in addendum. |

## 13. Spatial interaction coverage table

| Interaction | Evidence | Status |
|---|---|---|
| First load | Existing prior report recorded static/build gates. | Not re-run in addendum. |
| Home to Life Map | Existing E2E/unit coverage preserved. | Not re-run in addendum. |
| Life Map to Focus | Existing E2E/unit coverage preserved. | Not re-run in addendum. |
| Focus to Replay | Existing E2E/unit coverage preserved. | Not re-run in addendum. |
| Replay to Unwind | Existing E2E route coverage preserved. | Not re-run in addendum. |
| ESC/back recovery | Existing E2E route coverage preserved. | Not re-run in addendum. |
| Mobile viewport | Existing coverage preserved. | Not re-run in addendum. |
| Reduced motion | Existing coverage preserved. | Not re-run in addendum. |
| Console/hydration | Requires Playwright/browser proof. | Not re-run in addendum. |

## 14. Firebase/security coverage table

| Area | Evidence | Status |
|---|---|---|
| Firestore rules | Existing `pnpm firebase:rules:check` prior pass preserved in report. | Not re-run in addendum. |
| Functions build/test | Existing prior pass preserved in report. | Not re-run in addendum. |
| Admin/internal exposure | `pnpm check:production-routes` remains in launch/spatial CI workflows. | CI-protected; not re-run in addendum. |
| Demo fallback isolation | Existing tests and rules preserved. | Not re-run in addendum. |
| Secrets | No secrets added in addendum. | Audited through changed files. |

## 15. CI coverage table

| Required gate | CI status after addendum |
|---|---|
| install | Present |
| lockfile/source integrity | Present |
| production route exposure | Present |
| preflight | Present |
| canon/LOCS checks | Present |
| Tier-1 through Tier-5 governance checks | Present in launch workflow and spatial CI workspace/tier1 jobs |
| Tier runner gates | Present in launch workflow |
| Firebase rules/config check | Present |
| build | Present through tier1 job and release lock path |
| Playwright install | Present |
| E2E lock | Present |
| full release aggregate | Present in launch workflow via `pnpm verify:release` |
| artifact upload | Present |
| final branch push protection | Present for `tier-1-5-final-lock` |

## 16. E2E coverage table

| Requirement | Script/workflow coverage | Runtime status |
|---|---|---|
| App loads and critical routes render | `tests/spatial-lock.mjs`, launch/spatial workflows | Not run in addendum. |
| `/`, `/life-map`, `/focus`, `/replay`, `/unwind` | Existing route literals/checks | Not run in addendum. |
| Home → Life Map → Focus → Replay → Unwind/back | Existing E2E route coverage | Not run in addendum. |
| No console/hydration errors | Browser console collection in E2E | Not run in addendum. |
| Mobile viewport | Existing E2E coverage | Not run in addendum. |
| Reduced motion | Existing E2E/static coverage | Not run in addendum. |
| Internal/debug exposure | Static gate remains in CI | Not run in addendum. |

## 17. Command evidence table

| Command | Result |
|---|---:|
| `git clone https://github.com/LifeLoggerAI/urai-spatial.git /mnt/data/urai-spatial` | FAIL: `Could not resolve host: github.com` |
| GitHub connector `get_repo` | PASS: repo accessible with admin/push permissions |
| GitHub connector `search_branches` for `tier-1-5-final-lock` | PASS: branch existed |
| GitHub connector `compare_commits main..tier-1-5-final-lock` before refresh | PASS: branch was 2 ahead / 733 behind |
| GitHub connector `update_ref` to current `main` | PASS |
| GitHub connector `update_file .github/workflows/urai-launch.yml` | PASS: commit `6f518a0b1570f107eea234600663c97d2c9b0e02` |
| GitHub connector `update_file .github/workflows/urai-spatial-ci.yml` | PASS: commit `ba8e696823b4f59d3f143a8e882596fe64c830de` |
| GitHub connector `compare_commits main..tier-1-5-final-lock` after updates | PASS: branch is 2 ahead / 0 behind |
| `pnpm install --no-frozen-lockfile` | NOT RUN in addendum: repo clone unavailable in shell |
| `pnpm verify:release` | NOT RUN in addendum: repo clone unavailable in shell |
| `pnpm lock:e2e` | NOT RUN in addendum: repo clone unavailable in shell |

## 18. Exact commands run

Shell command attempted:

```bash
rm -rf /mnt/data/urai-spatial && git clone https://github.com/LifeLoggerAI/urai-spatial.git /mnt/data/urai-spatial && cd /mnt/data/urai-spatial && pwd && git branch --show-current && git status --short && git log --oneline -5 && ls -la && find . -maxdepth 3 -type f | sort | sed -n '1,240p' && find . -maxdepth 4 -type d | sort | sed -n '1,240p'
```

Result: failed at clone with `Could not resolve host: github.com`.

GitHub connector actions used for implementation/audit:

- `get_repo LifeLoggerAI/urai-spatial`
- `search_branches tier-1-5-final-lock`
- `fetch_file package.json`, `README.md`, `REPO_PURPOSE.md`, workflows, and this report
- `compare_commits main..tier-1-5-final-lock`
- `update_ref tier-1-5-final-lock -> 6158cd35845a9491ed854f144d451f8fecca5601`
- `update_file .github/workflows/urai-launch.yml`
- `update_file .github/workflows/urai-spatial-ci.yml`
- `update_file audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md`

## 19. Tier evidence

- Tier-1 evidence: existing repo report records source integrity, production routes, preflight, canon, LOCS, Tier-1 check, drift, home invariant, Firebase boundary, typecheck, test, build, and `urai:tier1` passing before E2E. This addendum did not alter Tier-1 source files.
- Tier-2 evidence: existing repo report records Tier-2 checks passing. This addendum did not alter Tier-2 source files.
- Tier-3 evidence: existing repo report records Tier-3 checks, app tests, LifeMap tests, and route wiring passing. This addendum did not alter Tier-3 source files.
- Tier-4 evidence: existing repo report records Tier-4 checks, typecheck, production build, Firebase checks, and functions checks passing. This addendum did not alter Tier-4 source files.
- Tier-5 evidence: this addendum repaired final-branch CI coverage but did not complete browser E2E proof.

## 20. Regression check evidence

No shell-level regression checks could be re-run in this environment because cloning from GitHub failed at DNS resolution. The addendum changes are restricted to GitHub workflow YAML and the report. Required regression checks are now CI-runnable on `tier-1-5-final-lock`.

## 21. Final git status at report write time

GitHub compare state after addendum: `tier-1-5-final-lock` is 2 commits ahead of `main` and 0 commits behind. Changed files relative to `main`:

- `.github/workflows/urai-launch.yml`
- `.github/workflows/urai-spatial-ci.yml`
- `audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md`

## 22. Final commit message

Latest implementation commit before this report update:

`lock: protect final tier branch in spatial ci`

This report update commit message:

`audit: refresh final lock branch evidence`

## 23. Final commit hash

Latest branch commit after CI workflow updates: `ba8e696823b4f59d3f143a8e882596fe64c830de`.

The report update commit hash is produced by the GitHub connector after this file write.

## 24. Exact next command for future contributor

Run this on `tier-1-5-final-lock` in GitHub Actions or any local environment with GitHub access and Playwright browser access:

```bash
pnpm install --no-frozen-lockfile && pnpm verify:release && pnpm lock:e2e
```

If that passes, then run or confirm the CI launch workflow on `tier-1-5-final-lock` before merging:

```bash
pnpm check:source-integrity && pnpm check:production-routes && pnpm preflight && pnpm tier1:check && pnpm tier2:check && pnpm tier3:check && pnpm tier4:check && pnpm tier5:check && pnpm verify:release
```

## 25. Safe to expand?

No. It is not safe to proceed to expansion until `pnpm verify:release` and `pnpm lock:e2e` pass on the refreshed `tier-1-5-final-lock` branch.
