# Launch Go/No-Go Checklist

Use this checklist with `docs/prelaunch/final-go-no-go-report.md` and `docs/prelaunch/launch-decision.md`.

## GO Requirements

- Build passes.
- Launch check passes.
- Patch check passes.
- Core routes load: `/`, `/demo`, `/u/adamclamp`, `/launch`, `/admin` denied when signed out.
- Demo uses sample data only.
- Passport is clear and reachable.
- Shadow, Legacy, Exports, Notifications, cloud sync, and sensitive integrations remain off by default.
- Companion AI cannot access closed layers.
- Waitlist works and fails gracefully.
- Firebase rules deny public user reads.
- Admin paths are admin-only.
- Mobile viewports are usable.
- Launch copy avoids medical, diagnosis, lie-detection, and surveillance claims.
- Media has no broken placeholders and no private data.
- Rollback/feature-disable path is ready.

## NO-GO Conditions

- Private data appears in demo, profile, media, exports, logs, or admin views.
- Firestore or Storage allows public user reads.
- Admin route or admin APIs are exposed.
- Passport can be bypassed.
- Shadow, Legacy, or Export opens by default.
- Companion uses closed sensitive context.
- Waitlist cannot safely capture or reject submissions.
- Build or launch checks fail.
- Rollback path is not available.

## Decision Source

The authoritative launch decision lives in `docs/prelaunch/launch-decision.md`. Do not deploy the public demo while that file says `NO-GO`.