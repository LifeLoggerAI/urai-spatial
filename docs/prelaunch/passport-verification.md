# Passport Verification

Date/time: 2026-06-04 UTC
Status: pending execution

## Tests Required

- Passport opens from Genesis.
- Passport opens from Companion boundary reply.
- Passport opens from Settings.
- Layer toggles work.
- Sensitive layers require explicit confirmation.
- AI Context review works.
- Export review works.
- Shadow cannot open through safe defaults.
- Legacy cannot open through safe defaults.
- Closing a layer removes its use from AI and visual systems.

## Expected Behavior

Passport remains the visible permission boundary for sensitive context, AI use, visual layers, and exports. Closed layers must be unavailable to Companion, visual systems, and export paths.

## Current Decision

Not approved for launch until Passport behavior is manually or automatically verified in the launch build.