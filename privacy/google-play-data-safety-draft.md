# Google Play Data Safety Reconciliation Draft

Status: **DRAFT — EXACT SIGNED BUILD + PRIVACY REVIEW REQUIRED**

This is an internal reconciliation worksheet, not a submitted Google Play declaration and not legal advice. The final Play answers must be derived from the exact signed Android build, exact enabled provider configuration, current runtime rules, and independent privacy review.

## Candidate runtime-to-store mapping

| Runtime capability / inventory | Candidate disclosure concern | Current release treatment |
| --- | --- | --- |
| Firebase Authentication / user profile | Account and identity data | Implemented; owner-scoped |
| Memory text | User-generated content | Implemented; exportable/deletable |
| Memory audio/images | Photos/media/audio and user content | Implemented; sensitive media governance required |
| AI insight records | Derived user-facing content | Partial; governed provider disclosure required when enabled |
| Voice events | Audio / voice interaction | Stubbed in inventory; do not declare collection from source presence alone |
| Behavioral signals | App/activity-derived signals | Stubbed in inventory; exact-build activation must be checked |
| Location context | Location | Partial runtime; explicit `location.context` consent required |
| Captured Reality source/manifest/runtime assets | User media + location-derived private spatial content | Implemented hard-off; dual consent required before activation |
| Export/deletion receipts | Account-management / privacy operations | Implemented; privacy-safe audit evidence |
| Crash/performance/diagnostic telemetry | App diagnostics | Must be reconciled to exact enabled analytics/observability stack |

## Questions that must be answered from the exact signed build

For each collected or shared data type, record:

- whether the exact build actually collects it;
- whether it leaves the device;
- which first-party or third-party processor receives it;
- whether processing is required or optional;
- the user-facing purpose;
- whether it is encrypted in transit;
- whether the user can request deletion;
- whether the data is ephemeral or retained;
- whether it is linked to account identity;
- whether any provider uses it for its own purposes;
- the exact consent/control surface governing it.

## Current fail-closed conclusions

- Source presence alone does **not** prove a data type is collected.
- A configured API key alone does **not** prove user data is sent to that provider.
- Hard-off Captured Reality capabilities must not be disclosed as active collection until enabled on the signed candidate.
- Stubbed voice/behavior capabilities must not be represented as active merely because schemas exist.
- The current machine-readable inventory marks inventoried data as non-monetizable and AI-training-disallowed.
- The final Play declaration must be regenerated if provider flags, telemetry, account flows, permissions, or the signed source SHA change.

## Required acceptance receipt

Before submission, record:

- signed Android source SHA;
- package name accepted by Play;
- upload/app-signing certificate fingerprint(s);
- exact build version;
- enabled providers;
- exact permissions requested;
- exact runtime telemetry configuration;
- privacy inventory version;
- privacy reviewer and decision;
- final Play Data Safety answers;
- submission timestamp / provider receipt.

Until those fields exist, classification remains:

**DATA SAFETY PREPARED — NOT SUBMISSION READY**
