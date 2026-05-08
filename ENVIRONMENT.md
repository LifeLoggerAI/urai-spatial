# URAI Spatial Environment

URAI Spatial is designed to boot in local fallback mode without live providers.

## Required local runtime

- Node 22+
- pnpm 8+
- Playwright Chromium for E2E and visual lock tests

## Optional public variables

```txt
NEXT_PUBLIC_URAI_SPATIAL_DOMAIN
NEXT_PUBLIC_URAI_DEBUG_SPATIAL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

## Optional server/provider variables

```txt
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
URAI_SPATIAL_INTEGRATION_API_KEY
URAI_CORE_BASE_URL
URAI_STUDIO_BASE_URL
ASSET_FACTORY_BASE_URL
URAI_JOBS_BASE_URL
```

Do not commit real secrets. Use deployment provider secret storage or local `.env.local` files.

## Fallback behavior

- `/api/body-biometric` returns deterministic privacy-safe snapshots when live-device or passive-inference providers are unavailable.
- `/api/orb-companion` returns local route hints and fallback replies when memory-grounded providers are unavailable.
- System APIs return integration contracts without exposing private keys, tokens, stack traces, or provider credentials.
- AR/WebXR and wearable providers are future seams unless explicitly connected and validated.

## Firebase notes

Suggested collections for live rollout:

- `spatial_sessions`
- `spatial_nodes`
- `lifemap_nodes`
- `lifemap_replays`
- `body_biometric_snapshots`
- `orb_companion_events`
- `spatial_assets`
- `spatial_anchors`
- `user_spatial_preferences`

Firestore and Storage rules must remain owner/tenant scoped before any live data write path is enabled.
