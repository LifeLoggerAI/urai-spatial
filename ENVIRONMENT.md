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
URAI_SPATIAL_INTEGRATION_API_KEY
URAI_CORE_BASE_URL
URAI_STUDIO_BASE_URL
ASSET_FACTORY_BASE_URL
URAI_JOBS_BASE_URL
```

### Managed identity and release boundary

Production mutation is currently **quarantined** in canonical Spatial source.

`.github/workflows/spatial-live-deploy.yml` verifies exact source and may prove a short-lived, read-only Google identity from `main` through GitHub OIDC + Google Workload Identity Federation. It contains no production deployment command and explicitly records a NO-GO release classification.

If production mutation is later re-enabled through separately reviewed protected authority:

- GitHub/provider authentication must remain short-lived OIDC/WIF or another explicitly approved managed identity;
- Google-managed runtimes must use attached Application Default Credentials (ADC) and the exact least-privilege runtime service account;
- provider and integration secrets must live in protected provider/environment secret storage;
- exact deployed revision/SHA, audit attribution, monitoring, recovery, and distinct rollback evidence remain required.

Do **not** provision or document `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_TOKEN`, downloaded service-account JSON, authorized-user ADC, or another user-managed long-lived Google credential as production deployment or runtime authority.

Local development may use supported local ADC where an authenticated provider test is explicitly required, but local credentials are never production evidence and must never be committed.

## Fallback behavior

- `/api/body-biometric` returns deterministic privacy-safe snapshots when live-device or passive-inference providers are unavailable.
- `/api/orb-companion` returns local route hints and fallback replies when memory-grounded providers are unavailable.
- System APIs return integration contracts without exposing private keys, tokens, stack traces, or provider credentials.
- AR/WebXR and wearable providers are future seams unless explicitly connected and validated.

## Firebase notes

Suggested collections for a future authorized live rollout:

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
