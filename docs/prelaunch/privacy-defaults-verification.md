# Privacy Defaults Verification

Date/time: 2026-06-04 UTC
Status: pending execution

## Default Off

These must remain off by default before launch:

- Shadow.
- Legacy.
- Export.
- Notifications.
- Push.
- SMS.
- Email.
- Companion memory.
- Companion cloud sync.
- Shadow cloud sync.
- Legacy cloud sync.
- Audio capture.
- Transcripts.
- Location.
- Gmail.
- Calendar.
- Health.
- Relationships.
- Sensitive device behavior sync.

## Default Safe / Limited

These may appear only in safe or limited form:

- Mood visual adaptation.
- Life Map safe preview.
- Ground safe preview.
- Mirror safe preview.
- AI Companion basic safe context.
- System-safe rituals.
- Local-only mode.

## Rules To Confirm

- No sensitive layer enabled by safe defaults.
- No hidden export path.
- No AI access to closed layers.
- No Shadow content outside Shadow.
- No Legacy storage without opt-in.

## Current Decision

Not approved for launch until privacy defaults are verified in a production build and Firebase rules checks pass.