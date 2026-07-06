# URAI Ecosystem Execution Delta

Timestamp: 2026-07-06T06:56:00Z

This file supplements the canonical receipt index without replacing concurrently added evidence.

## DELTA-COMMS-01

- Repository: `LifeLoggerAI/urai-communications`
- Pull request: #27
- Current head inspected: `69319af18397f76c3c5637390e8ec4ec46006ae9`
- Added/verified:
  - fail-closed callback provider/status validation;
  - recursive payload redaction;
  - deterministic callback event IDs;
  - Firestore transaction reads the deterministic event before the delivery log write;
  - duplicate callbacks return idempotently without rewriting the delivery log;
  - callback transaction source regression tests.
- Current workflows: CI `28773363088`, Production Verify `28773363120` — queued.
- Remaining: provider-native signature/replay verification, provider-message-ID binding, deployment and real provider receipts.

## DELTA-ASSET-01

- Repository: `LifeLoggerAI/asset-factory`
- Pull request: #144
- Head: `31bdd1b8f42b09f212d49ad980f837604e59f469`
- Added:
  - application-default/service-account deploy authentication;
  - exact workflow commit record;
  - credential-document validation and permission restriction;
  - cleanup of the temporary credential file;
  - static rejection of restored legacy token authentication;
  - migration evidence note.
- Current workflows: seven exact-head runs queued.
- No deploy, provider call, paid generation or promotion was triggered.
- Canonical asset counts are owned by stronger Asset Factory contract PR #141: V1=53, V2=80, V3=14, V4=39, V5=27.

## DELTA-STAGING-01

- Repository: `LifeLoggerAI/urai-staging`
- Pull request: #15
- Head: `a230b21d26a01d4f5ca4bbc13105d94dfc64d0ab`
- Added:
  - staging-only environment authority;
  - rejection of production/unexpected Firebase aliases;
  - exact checked-out SHA verification;
  - credential JSON and project-ID validation;
  - unconditional credential cleanup;
  - strengthened deploy-readiness source checks.
- No deploy was triggered.

## DELTA-PRIVACY-01

- Repository: `LifeLoggerAI/urai-privacy`
- Pull request: #91
- Head: `91c188d59f88664cc534f9c4a30a21e0dc26d6bc`
- Added:
  - removes unproved repo-complete/public-launch-eligible flags;
  - records `urai-spatial` / `urai-tier1` as canonical public authority;
  - defines required adoption proof for Privacy Controls, Passport, export, deletion, consent, legal hold, revocation and cross-user denial.
- Status: implemented but not deployed; live authenticated proof and counsel approval absent.

## DELTA-JOBS-01

- Repository: `LifeLoggerAI/urai-jobs`
- Pull request: #73
- Head: `6d3893e8574d1bb635294ac19750960d6debd82e`
- Added:
  - frozen root lockfile installation in validation and emulator CI;
  - read-only workflow permissions;
  - pinned Firebase emulator CLI version;
  - longer E2E diagnostic retention.
- No worker deployment or live queue proof was triggered.

## DELTA-SPATIAL-OPS-01

- Repository: `LifeLoggerAI/urai-spatial`
- Issues:
  - #422 — deploy dedicated Privacy Controls and prove custom-domain/Focus parity;
  - #427 — required Actions runs remain queued without logs.
- Status patch:
  - PR #417 commit `05e3d262c60d030ec7395a8ca55e043813f132b4` safely renders partial release receipts.
- No production deployment was triggered because deployed and rollback SHAs are still unknown and release gates have not completed.
