# URAI Privacy Data Inventory

Status: **IMPLEMENTED INVENTORY / PRIVACY REVIEW PENDING**

Repository: `LifeLoggerAI/urai-spatial`  
Privacy package: `0.1.0-draft`  
Machine-readable authority: `privacy/data-inventory.yaml`  
Last machine-readable inventory review date: 2026-09-25  
Independent privacy reviewer: **PENDING**

This document mirrors the current machine-readable repository inventory. It is not a legal or privacy approval. Runtime behavior, Firestore rules, storage paths, provider processing, retention, export, deletion, and feature manifests must still be reconciled against the exact release candidate before privacy acceptance.

## Current inventoried data classes

| Field | Store / path | Source | Class | Purpose | Exportable | Deletable | AI training | Current implementation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| User profile | `users` | User account | L2 | Identity and profile context | Yes | Yes | No | Complete per repo audit |
| Memory text | `memories` | User provided | L3 | User-created memory text | Yes | Yes | No | Complete per repo audit |
| Memory media | `memories/storage` | User upload | L4 | User-created audio/image memories | Yes | Yes | No | Complete per repo audit |
| Memory star visualization | `stars` | System derived | L2 | Spatial representation of memories | Yes | Yes | No | Complete per repo audit |
| Insight record | `insights` | Model derived | L4 | User-facing AI-generated insights | Yes | Yes | No | Partial per repo audit |
| Voice event | `voiceEvents` | User voice interaction | L5 | Governed voice-interaction storage | Yes | Yes | No | Stubbed per repo audit |
| Behavior signal | `behaviorSignals` | System collected | L4 | Governed behavioral-signal processing | Yes | Yes | No | Stubbed per repo audit |
| Location record | `locations` | Device/user provided | L3 | Memory-associated location context | Yes | Yes | No | Partial current runtime |
| Captured Reality manifest | `users/{uid}/capturedRealityAssets` | System derived | L3 | Private real-place provenance/truth/runtime governance | Yes | Yes | No | Implemented, hard-off |
| Captured Reality runtime asset | Private object storage | System derived | L3 | Authorized private reconstruction delivery | Yes | Yes | No | Implemented, hard-off |
| Captured Reality Replay binding | `users/{uid}/capturedRealityReplayBindings` | System derived | L3 | Bind one authorized memory to one reviewed captured place | Yes | Yes | No | Implemented, hard-off |

All inventoried rows are marked non-monetizable and not permitted for AI training by the current machine-readable inventory. Administrative access is not represented as generally available; audit evidence is required.

## Consent boundaries

Current machine-readable consent references include:

- user profile: C1;
- memory text: C2;
- memory media and model insight records: C4;
- voice events: C5;
- location context: explicit `location.context`;
- Captured Reality manifest/runtime/bindings: both `memory.storage` and `location.context`.

These identifiers are implementation governance labels. They are not substitutes for user-facing consent language or legal review.

## Current processors

| Processor | Role | Repository status | Review status |
| --- | --- | --- | --- |
| Firebase Authentication | Authentication | Complete per repo audit | Privacy review required |
| Firestore | Primary database | Mixed complete/partial/stubbed | Privacy review required |
| Firebase Storage | Media/private asset storage | Complete per repo audit | Privacy review required |
| Firebase Hosting | Frontend hosting | Complete per repo audit | Privacy review required |

External AI/media providers must be declared from the exact release configuration when enabled. A provider appearing elsewhere in source or Secret Manager does not by itself mean user data is sent to that provider.

## User rights implemented in current source

The current runtime contains governed paths for:

- consent review, narrowing, pausing and revocation;
- owner-scoped export requests;
- scoped deletion requests;
- full repository-controlled data deletion;
- full-account deletion with a grace-period state;
- cancellation of eligible queued deletion/export requests;
- privacy-safe operational receipts;
- reauthentication requirements for destructive operations.

Completion must be determined from the trusted backend job state. The UI must not represent data as deleted merely because a request was accepted.

## Launch reconciliation still required

Before privacy acceptance on the exact release candidate:

1. Reconcile this inventory against current production Firestore rules, indexes, Functions, Storage paths and client bundles.
2. Reconcile every active feature manifest with actual runtime collection, use, disclosure, export and deletion behavior.
3. Identify every enabled external processor and the precise data sent to it.
4. Confirm retention and backup deletion/expiry behavior.
5. Confirm revocation propagation for derived data and provider-side copies where applicable.
6. Confirm location, voice, likeness, media, Captured Reality and passive-signal consent boundaries.
7. Confirm user export and deletion from authenticated end to end with privacy-safe receipts.
8. Confirm no private values, secrets, raw recipient addresses or private captures leak into public logs/build artifacts.
9. Reconcile Google Play / distribution data-safety declarations to the exact signed build.
10. Obtain independent privacy review and record the reviewer, decision, date and exact source SHA.

## Acceptance boundary

**Current classification: IMPLEMENTED INVENTORY / INDEPENDENT PRIVACY ACCEPTANCE PENDING.**

Do not promote this document, the YAML inventory, CI success, or a store questionnaire draft into a claim of legal compliance or final privacy certification.
