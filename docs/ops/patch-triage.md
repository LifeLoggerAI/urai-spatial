# Patch Triage

Patch triage classifies every launch issue before work begins. Privacy and Passport failures always outrank visual polish, roadmap requests, and speculative improvements.

## Severity Levels

### P0 - Privacy / Safety Critical

Examples:

- Private data exposed.
- Passport bypass.
- Shadow opens without consent.
- Legacy saves without consent.
- Export leaks hidden or sealed data.
- Admin route exposed.
- Firestore rules public.
- AI uses closed sensitive layer.

Rule: P0 triggers immediate rollback or feature disable.

### P1 - Core Flow Broken

Examples:

- Genesis does not load.
- Companion unusable.
- Passport unusable.
- Onboarding blocked.
- Demo broken.
- Waitlist broken.
- Settings cannot disable features.

Rule: P1 triggers hotfix.

### P2 - Major UX Issue

Examples:

- Mobile layout broken.
- Audio loop stuck.
- Performance jank.
- Confusing privacy copy.
- Life Map, Ground, or Mirror broken while app remains usable.

Rule: P2 goes into next patch.

### P3 - Minor Polish

Examples:

- Visual crop issue.
- Optional sound missing.
- Small copy fix.
- Noncritical animation issue.

Rule: P3 batches into polish release.

## Triage Rules

- Classify by user impact and privacy risk, not implementation effort.
- Treat unknown privacy exposure as P0 until disproven.
- If multiple severities apply, use the highest severity.
- Do not combine feature requests with bug patches.
- Document the severity in the changelog entry.
