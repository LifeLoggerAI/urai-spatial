# Rollback Triggers

## Immediate Rollback Or Feature Disable

Rollback or disable the affected feature immediately if any of these occur:

- Passport bypass.
- Private data exposure.
- Admin route exposed.
- Firestore or Storage public data issue.
- Companion sends closed sensitive context.
- Shadow, Legacy, or Export default-on regression.
- Demo uses private account data.
- Build deploy breaks home or demo route.

## Feature-Flag Disable First If Possible

Prefer disabling the smallest affected surface before a full rollback when that safely contains the issue:

- Companion AI.
- Exports.
- Shadow.
- Legacy.
- Notifications.
- Cloud sync.
- Public demo.
- Waitlist.

## Rollback Notes

- P0 issues do not wait for a complete diagnosis.
- Re-enable a disabled feature only after privacy checks and a launch smoke test pass.
- Document rollback decisions in `CHANGELOG.md` and the relevant incident notes.
