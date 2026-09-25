# UrAi Wearable Provider Admission — 2026-09-25

Status: SOURCE FOUNDATION COMPLETE / REAL INGESTION EXTERNAL-GATED

## What exists

The #1298 expansion authority already has a synthetic-only normalization boundary for sleep, steps, motion and energy, explicit permission references, bounded retention, revocation clearing, local-processing preference, no interpretation, no clinical meaning and `realIngestionAllowed:false`.

This successor adds provider-specific admission metadata for:

- Apple HealthKit / Apple Watch;
- Android Health Connect / Wear OS;
- Fitbit Web API;
- Oura API;
- Garmin Health API;
- WHOOP API.

No provider is activated by this document or registry.

## Account and provider setup gates

### Apple HealthKit

Required before real ingestion:
- active Apple Developer/signing authority for the native app;
- real iOS/iPadOS/watchOS package;
- HealthKit capability/entitlement;
- read usage description and only the actually needed data types;
- per-type user permission at runtime;
- App Privacy/privacy-policy alignment;
- device/runtime evidence.

Current UrAi web/PWA runtime cannot satisfy native HealthKit access by itself.

### Android Health Connect

Required before real ingestion:
- native Android package;
- Health Connect dependency and manifest read permissions for each used data type;
- runtime user permission;
- Play Console Health apps declaration and privacy/Data safety alignment;
- additional background/history permission only if that behavior is actually admitted;
- device/runtime evidence.

Current UrAi web/PWA runtime cannot satisfy native Health Connect access by itself.

### Fitbit

Required before real ingestion:
- Fitbit developer application;
- OAuth client/redirect configuration;
- user OAuth and revocation;
- minimum read scopes (launch foundation: activity + sleep);
- provider terms compliance;
- separate approval for third-party intraday data where required;
- protected server token storage and runtime proof.

### Oura

Required before real ingestion:
- Oura developer application;
- OAuth client/redirect configuration;
- user OAuth/revocation;
- minimum launch scope candidate: `daily` and `workout`;
- email/personal/heart-rate/SpO2/tag/session remain off by default;
- protected server token storage and runtime proof.

### Garmin Health

Required before real ingestion:
- Garmin Connect Developer Program application and approval;
- evaluation environment access;
- user consent;
- only necessary subscribed feeds;
- commercial license/payment if applicable;
- runtime proof.

### WHOOP

Required before real ingestion:
- WHOOP membership/developer login;
- Developer Dashboard team/app;
- client ID and server-only secret;
- registered redirect URI;
- user OAuth with minimum scopes;
- protected access/refresh-token rotation;
- revoke provider access on disconnect;
- provider app approval before production.

Launch scope candidates are sleep, recovery/cycles and workout-derived motion/energy. Profile and body-measurement scopes remain off by default.

## Safety policy

Provider raw data may not silently become diagnosis, treatment advice, clinical fact or a permanent memory.

The launch normalization contract remains limited to sleep, steps, motion and energy. Any additional sensitive measurement class requires a separate privacy/product/legal admission and exact runtime evidence.

Disconnect stops future ingestion. Retention/deletion of already imported material is a separate user-controlled decision and must follow UrAi privacy receipts.

## Completion meaning

Provider-source work is complete when the registry and conformance tests pass.

A provider is operational only after its real account/application, OAuth/native permission path, secrets/entitlements, user consent, runtime ingestion, revocation, privacy/export/delete path, monitoring and exact-head receipt all pass. Until then its state remains EXTERNAL_GATE.
