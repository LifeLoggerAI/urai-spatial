# Firebase Rules Verification

Date/time: 2026-06-04 UTC
Status: pending execution

## Checks

- Users can read/write only their own user tree.
- Waitlist allows public create only.
- Waitlist has no public read.
- Admin paths are admin-only.
- Storage user files are private.
- No public user exports.
- Deny-by-default exists.

## Emulator / Test Guidance

If Firebase emulator is available, run rules tests before launch. Existing related scripts include `firebase:rules:check`, `test:rules`, and `test:firestore-rules`.

## Current Decision

Not approved for launch until Firebase rules tests or documented manual verification pass.