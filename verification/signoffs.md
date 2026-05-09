# URAI Spatial Launch Signoff Ledger

This file is the human verification ledger for the URAI Spatial launch lock.

Do not deploy production until every production/live section below has a date, signer, and evidence link or note.

## Engineering

- Status: AUTOMATION PASSED / MANUAL REVIEW PENDING
- Signer: Adam Clamp / URAI Labs
- Date: 2026-05-09
- Evidence:
  - `pnpm --filter urai-tier1 test` passed: 63 tests, 63 pass, 0 fail.
  - `pnpm --filter urai-tier1 build` passed: Next.js production build completed, 34 static pages generated.
  - `pnpm preflight` passed with local runtime warnings for missing deployment secrets.
  - `pnpm firebase:rules:check` passed: Firestore Tier-1 boundaries passed.
  - Evidence recorded in PR #188 validation log and `docs/SPATIAL_LOCK_QA_CHECKLIST.md`.

## Rendering / Performance

- Status: AUTOMATION PASSED / MANUAL DEVICE QA PENDING
- Signer: Adam Clamp / URAI Labs
- Date: 2026-05-09
- Evidence:
  - `pnpm --filter urai-tier1 build` completed successfully.
  - Route generation includes `/`, `/home`, `/ascent`, `/life-map`, `/focus`, `/replay`, `/mirror`, `/spatial`, `/admin/invites`, `/privacy`, and `/terms`.
  - Manual desktop/mobile visual QA and optional Playwright E2E remain pending before production deployment.

## Security / Privacy

- Status: AUTOMATION PASSED / LIVE SECRET+DEPLOYMENT CHECKS PENDING
- Signer: Adam Clamp / URAI Labs
- Date: 2026-05-09
- Evidence:
  - `pnpm firebase:rules:check` passed.
  - Home World Firestore paths are explicitly covered in `firebase/firestore.rules`.
  - Preflight passed but local runtime warned that production deployment secrets were not present in that environment.

## Domain / DNS / SSL

- Status: PENDING LIVE CHECK
- Signer:
- Date:
- Evidence:
  - Not validated in this PR branch.

## Product Launch

- Status: PENDING MANUAL QA + DEPLOYMENT SMOKE
- Signer:
- Date:
- Evidence:
  - Automated Tier-1 app tests/build are green.
  - Manual visual QA, optional E2E, preview deploy, production deploy, and production smoke remain pending.

## Required live checks

- [ ] GitHub secrets exist.
- [ ] Firebase Hosting custom domain connected.
- [ ] SSL active.
- [ ] Firebase Auth authorized domains configured.
- [ ] Firestore rules deployed.
- [ ] Functions deployed on Node 20.
- [ ] Preview deploy passed.
- [ ] Production deploy passed.
- [ ] Production homepage smoke passed.
- [x] Spatial tier-lock tests passed.
- [ ] Rendering/performance QA passed on desktop and mobile.
- [ ] Admin/founder custom claims verified if used.

## Final deployment rule

This branch is eligible for review/merge after PR checks are green. It is not a production-deploy approval by itself. Production deployment requires the unchecked live checks above to be completed and recorded.
