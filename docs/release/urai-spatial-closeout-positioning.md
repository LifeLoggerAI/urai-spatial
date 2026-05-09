# urai-spatial Closeout Positioning

## Release candidate

RC SHA:

0e486183d510ffd1bd2eb1c4dea06340a29ca5c0

## Positioning

urai-spatial is a strategic Spatial/XR surface for URAI, but it should not block V1 production closeout.

Spatial/XR should remain feature-flagged, scoped out, or explicitly approved before being treated as part of the production launch surface.

## Validation observed

- Firestore Tier-1 boundaries passed
- Typecheck passed
- Lint passed
- Next.js production build passed
- Working tree clean
- Branch pushed to origin

## Current caveat

The latest terminal output also showed contract/unit failures around the active HomeScene expectations and replay privacy copy, plus a later Next.js build failure with `PageNotFoundError: Cannot find module for page: /_document`.

Those failures should be treated as unresolved until fixed and re-run cleanly.

## Production note

Do not run strict production gates with placeholder staging/prod project IDs or placeholder rollback SHA.

Use real environment IDs and a real known-good rollback SHA before production promotion.
