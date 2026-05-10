# URAI Privacy Adoption Report

Repository: LifeLoggerAI/urai-spatial
Status: blocked - mapped, not production approved
Privacy version: 0.1.0-draft
Last updated: 2026-05-09

## Summary

URAI Spatial now has a structured privacy adoption package based on the repository audit evidence. The repository has privacy version tracking, structured data inventory, feature manifest coverage for the audited Firestore collections and Cloud Functions, and a GitHub Actions privacy adoption workflow.

This does **not** mean URAI Spatial is production privacy-approved. Most mapped features are still blocked because the repo audit identifies them as stubbed, partial, or planned. Launch remains blocked until implementation, consent enforcement, export/deletion behavior, explanation behavior, audit events, security rules, CI results, and privacy review are completed and verified.

## Required files

- [x] `privacy/PRIVACY_VERSION.md` exists.
- [x] `privacy/data-inventory.md` exists.
- [x] Structured `privacy/data-inventory.yaml` exists.
- [x] `privacy/feature-manifests/` exists.
- [x] Feature manifests exist for audited data-processing features.
- [x] `.github/workflows/privacy-adoption-check.yml` exists.

## Feature manifest coverage

- [x] `process-new-memory.privacy.yaml`
- [x] `generate-insights.privacy.yaml`
- [x] `aggregate-timeline.privacy.yaml`
- [x] `score-relationship-signals.privacy.yaml`
- [x] `voice-events.privacy.yaml`
- [x] `behavior-signals.privacy.yaml`
- [x] `locations.privacy.yaml`
- [x] `emotion-logs.privacy.yaml`
- [x] `rituals.privacy.yaml`
- [x] `dream-logs.privacy.yaml`
- [x] `relationships.privacy.yaml`
- [x] `companion-state.privacy.yaml`
- [x] `notifications.privacy.yaml`
- [x] `clusters.privacy.yaml`
- [x] `replays.privacy.yaml`

## Data mapping

- [x] Completed collections mapped from repo audit: `users`, `memories`, `stars`.
- [x] Partial collection mapped from repo audit: `insights`.
- [x] Stubbed/planned collections mapped from repo audit: `clusters`, `replays`, `emotionLogs`, `voiceEvents`, `behaviorSignals`, `locations`, `relationships`, `rituals`, `dreamLogs`, `notifications`, `companionState`.
- [x] Firebase services mapped from repo audit: Authentication, Firestore, Storage, Hosting.
- [ ] Mapping reviewed against actual production schema.
- [ ] Mapping reviewed against Firestore security rules.
- [ ] Mapping reviewed against runtime behavior.

## Consent mapping

- [x] Consent tiers are mapped in feature manifests.
- [x] Sensitive inference features are marked as requiring explicit consent.
- [x] Biometric or identity-linked voice processing is marked as requiring explicit consent and biometric deletion support.
- [x] Data-sharing and monetization are blocked by default.
- [ ] Runtime consent checks are implemented and tested.
- [ ] Revocation behavior is implemented and tested.

## User rights

- [x] Export expectations are mapped in inventory and manifests.
- [x] Deletion expectations are mapped in inventory and manifests.
- [x] Biometric deletion expectations are mapped for voice events.
- [x] Explanation expectations are mapped for sensitive inference features.
- [ ] Export jobs are implemented and tested.
- [ ] Deletion jobs are implemented and tested.
- [ ] Biometric deletion job is implemented and tested where relevant.
- [ ] Explanation UI/API is implemented and tested.

## Operations

- [x] Audit event expectations are mapped in feature manifests.
- [x] Admin access is blocked by default in feature manifests.
- [ ] Audit event emission is implemented and tested.
- [ ] Least-privilege admin/support access is implemented and tested.
- [ ] Incident response owner is assigned.
- [ ] Backup deletion or expiry behavior is documented and tested.

## CI and verification

- [x] Privacy adoption workflow file exists.
- [ ] Latest GitHub Actions run is verified passing.
- [ ] Privacy files are validated against URAI Privacy schemas.
- [ ] Product owner review is complete.
- [ ] Privacy reviewer approval is complete.
- [ ] Legal review is complete where required.

## Launch decision

Status: blocked until completed and reviewed.

URAI Spatial is privacy-mapped but not privacy-approved. It must not be represented as fully production-ready until runtime consent, export, deletion, explanation, audit, security, CI, support, and review gates pass end to end.
