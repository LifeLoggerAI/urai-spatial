# URAI Spatial release evidence

Current reviewed main commit: `7a924a08c235969cbd9abfae4c8d203b87737cf3`.

## Verified locally

- Deterministic runtime TypeScript check passed.
- Compiled runtime smoke passed with persistence and restore.
- Static source contract passed 24 assertions.
- Firebase publishes `urai-tier1/out` with clean URLs, trailing slashes, and no masking rewrites.
- Build-SHA evidence is embedded in root metadata and markup.
- Privacy Controls, Focus, and Status have dedicated source markers.
- Asset gate totals match manifests: V2 80, V3 14, V4 39.
- All three asset lanes correctly remain fallback because ready provider assets are zero.

## Still blocked

Hosted workflow runs remain queued without steps, logs, conclusions, or artifacts. Live deployed-SHA parity, current production build evidence, and provider-generated asset receipts are not certified.
