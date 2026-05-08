# URAI Spatial Tier Lock Packet Index (2026-05-05)

## Purpose
Single source index for Tier lock artifacts, pass criteria, and release/exception signoff.

---

## A) Packet artifacts (cross-links)

### Core execution + lock reports
1. Tier-2/Tier-3 execution inventory
   - `docs/tier2/TIER2_TIER3_EXECUTION_REPORT_2026-05-05.md`
2. Tier-2 lock report
   - `docs/tier2/TIER2_LOCK_REPORT_2026-05-05.md`
3. Tier-3 wiring lock report
   - `docs/tier2/TIER3_WIRING_LOCK_REPORT_2026-05-05.md`

### Tier-2 hard-pass evidence artifacts
4. Route state matrix (loading/empty/error/permission)
   - `docs/tier2/TIER2_ROUTE_STATE_MATRIX_2026-05-05.md`
5. Mock-path exclusion proof
   - `docs/tier2/TIER2_MOCK_PATH_EXCLUSION_PROOF_2026-05-05.md`

---

## B) Validation command pack

Required validation commands for this lock packet:
- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm test:canon`

Current status (this packet revision):
- Lint: PASS
- Build: PASS
- Test: PASS (browser-dependent flows guarded in environment)
- Canon: PASS

---

## C) Pass criteria checklist

### Tier-1 compatibility (must remain locked)
- [x] No canon drift (`pnpm test:canon`)
- [x] No TypeScript regression in runtime project
- [x] No build break

### Tier-2 completion gates
- [x] Route surfaces present and wired (`/home`, `/life-map`, `/focus`, `/mirror`, `/replay`)
- [x] Route-state matrix documented (loading/empty/error/permission)
- [x] Mock/demo/placeholder exclusion proof documented
- [x] Lint/build/test passing in current environment

### Tier-3 completion gates
- [x] Tier-3 wiring report present
- [x] Replay/narrator/life-map integration surfaces enumerated
- [x] Canon/LOCS/tier-drift checks pass
- [ ] Unguarded browser E2E/replay executed with installed Playwright binaries

---

## D) Release signoff block

Release decision: **CONDITIONAL APPROVAL**

Conditions met:
- Core code quality, build, and canon checks pass.
- Tier-2 and Tier-3 lock artifacts are present and cross-referenced.

Condition outstanding:
- Browser-binary-dependent E2E/replay verification is guarded/skipped in this environment.

Signoff:
- Engineering: ____________________  Date: __________
- Product/Canon Owner: ____________ Date: __________
- QA Lead: ________________________ Date: __________

---

## E) Exception signoff block

Exception ID: `LOCK-EXC-PLAYWRIGHT-BINARY-001`

Exception description:
- Playwright browser binaries are unavailable in this runtime environment; guarded scripts skip browser-dependent lock runners.

Risk assessment:
- Medium for visual/browser-only regressions.
- Low for TypeScript/build/canon/runtime wiring regressions (covered by passing checks).

Mitigation:
1. Run `pnpm --filter urai-tier1 exec playwright install` in release environment with CDN access.
2. Re-run:
   - `pnpm test:e2e`
   - `pnpm test:replay-tier5`
3. Attach run logs to release ticket before final production unlock.

Exception approval:
- Engineering Manager: ____________ Date: __________
- QA/Release Manager: _____________ Date: __________
- Canon Owner: ____________________ Date: __________
