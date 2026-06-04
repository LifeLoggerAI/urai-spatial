# Deployment Smoke Test

Run this after staging or production deployment and before public sharing.

## Required Checks

- Open `/` and confirm Genesis loads.
- Open `/demo` and confirm sample data disclosure is visible.
- Open `/u/adamclamp` and confirm founder-safe sample data only.
- Open `/launch` and confirm no broken media placeholders.
- Open `/admin` while signed out and confirm access is denied.
- Call or exercise `/api/waitlist` with a controlled internal test address.
- Confirm waitlist failure state is graceful when backend write is unavailable.
- Confirm `/api/admin/status` does not expose secrets or private user content.
- Confirm Passport opens and sensitive layers remain closed by default.
- Confirm Shadow, Legacy, and Export gates require explicit review/confirmation.
- Confirm Companion does not claim private knowledge in demo mode.
- Confirm Firebase rules or production rules checks pass.
- Confirm no browser console stack traces or provider crashes on core routes.
- Confirm mobile viewport usability for demo and waitlist.

## Smoke Result Template

Date/time:
Reviewer:
Environment:
Commit/version:
Result: pass / fail
Blocking issues:
Rollback needed: yes / no
Notes:

## Rollback Rule

Rollback or disable the affected feature immediately for P0 privacy/safety issues, admin exposure, public user data reads, Passport bypass, or demo private-data exposure.