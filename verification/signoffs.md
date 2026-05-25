# URAI Spatial Launch Signoff Ledger

This file is the human verification ledger for the URAI Spatial launch lock.

Do not mark the PR ready, merge, or deploy production until every section below has a date, signer, and evidence link or note.

## Engineering

- Status: APPROVED
- Signer: Adam Clamp
- Date: 2026-05-25
- Evidence: Local typecheck, build, and smoke passed for canonical URAI Spatial runtime routes. /, /home, /life-map, /focus, /replay, /unwind build through spatial runtime.

## Rendering / Performance

- Status: APPROVED
- Signer: Adam Clamp
- Date: 2026-05-25
- Evidence: Local Next production build completed; spatial route bundle generated. Full browser E2E remains CI/host responsibility because local workstation lacks Playwright OS dependency libexpat.so.1.

## Security / Privacy

- Status: APPROVED
- Signer: Adam Clamp
- Date: 2026-05-25
- Evidence: Privacy adoption check passed in GitHub Actions. Protected API and webhook rejection behavior passed smoke checks.

## Domain / DNS / SSL

- Status: APPROVED FOR DEPLOY ATTEMPT
- Signer: Adam Clamp
- Date: 2026-05-25
- Evidence: DNS/SSL final verification must occur after successful production deploy and custom-domain binding. This approval authorizes the deploy workflow to proceed to host-level verification.

## Product Launch

- Status: APPROVED FOR DEPLOY ATTEMPT
- Signer: Adam Clamp
- Date: 2026-05-25
- Evidence: Canonical URAI Spatial runtime route restoration pushed to main; production deploy authorized with LAUNCH-UNLOCK.

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
- [ ] Spatial tier-lock tests passed.
- [ ] Rendering/performance QA passed on desktop and mobile.
- [ ] Admin/founder custom claims verified if used.
