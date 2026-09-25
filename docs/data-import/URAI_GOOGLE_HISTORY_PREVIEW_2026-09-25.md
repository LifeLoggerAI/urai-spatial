# UrAi Google Historical Context Preview — 2026-09-25

Status: SOURCE COMPLETE FOR PREVIEW / RAW INGEST BLOCKED

## Implemented

An authenticated UrAi user with an existing Google Workspace connection can explicitly choose one or more categories and request an aggregate history preview.

Supported preview categories:
- Gmail: estimated matching message count only;
- Calendar: event ID count only;
- Contacts: aggregate connection count only;
- selected/app-accessible Drive files: ID count only within the existing drive.file scope.

Supported preview windows are 90 days, 1 year, 3 years and 10 years.

Nothing is selected by default.

## Privacy boundary

Preview requires a separate button press after provider connection.

The server:
- verifies the Firebase user;
- verifies the Google provider connection;
- refuses preview if provider processing is privacy-paused;
- refreshes the Google access token only server-side when needed;
- never fetches Gmail message bodies or subjects for preview;
- never persists Calendar titles, attendees, locations or descriptions for preview;
- never persists Contact names/addresses for preview;
- never persists Drive file content for preview;
- writes only private aggregate availability and receipt metadata;
- records persistedRawItems = 0;
- records admittedToMemory = false and admittedToModels = false.

Provider connection, preview, import, memory admission, model use and generated-media use remain separate authorities.

## Drive limitation

The current Google connection uses drive.file rather than broad Drive read access. Therefore the preview truthfully labels this category as selected/app-accessible Drive files, not complete Drive history.

No scope is broadened by this implementation.

## Still blocked

This preview is not raw historical import.

Raw provider content ingestion, immutable private-vault storage, content normalization, dedupe/conflict resolution, memory admission and Life Movie use require their own exact implementation and consent/runtime receipts.

No production provider verification, OAuth-app approval, deployment or user-data import is claimed by this source receipt.
