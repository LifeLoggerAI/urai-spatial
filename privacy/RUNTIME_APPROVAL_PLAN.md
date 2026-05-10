# URAI Spatial Runtime Privacy Approval Plan

Status: blocked until implemented, tested, and reviewed  
Privacy version: 0.1.0-draft  
Last updated: 2026-05-09

## Purpose

URAI Spatial is now privacy-mapped, but it is not privacy-approved. This plan turns the remaining launch blockers into executable implementation gates.

A feature is not production-ready until its feature manifest, runtime implementation, tests, user-rights behavior, audit events, and review status all match.

## 1. Runtime consent checks

### Required behavior

- Every data-processing feature must check the user's current consent state before collection, inference, sharing, or retention.
- Sensitive inference features must require explicit consent.
- Voice or biometric/identity-linked features must require separate explicit consent.
- Data-sharing or monetization must remain disabled unless the required opt-in exists.

### Candidate implementation surface

- Shared consent guard utility.
- Feature-level policy lookup from `privacy/feature-manifests/*.privacy.yaml`.
- Server-side enforcement before writes to sensitive collections.
- Client-side UX that explains why consent is needed before enabling a feature.

### Acceptance criteria

- Unit tests prove blocked consent prevents writes or inference jobs.
- Integration tests prove consented users can use the feature.
- Revoked consent blocks future processing.
- All blocked events are audit logged.

## 2. Consent revocation behavior

### Required behavior

- Users can revoke feature-level or purpose-level consent.
- Revocation stops future processing.
- Revocation triggers deletion, anonymization, or retention handling according to the feature manifest.
- Revocation is recorded with timestamp, policy version, scope, and source.

### Acceptance criteria

- Revocation updates durable consent state.
- Revocation prevents future writes/inference for the revoked scope.
- User-visible state reflects revocation.
- Audit events are emitted.

## 3. Export jobs

### Required behavior

- Users can export mapped data from `users`, `memories`, `stars`, `insights`, and any launched mapped collection.
- Export includes user-visible records and derived records where exportable is true.
- Export excludes internal-only security metadata unless required by policy.

### Acceptance criteria

- Export job produces a portable bundle for a test user.
- Export includes memory records, media references or signed export copies, star records, and launched insight records.
- Export records job status and audit events.
- Export handles empty collections safely.

## 4. Deletion jobs

### Required behavior

- Users can delete account-linked records according to inventory and feature manifests.
- Deletion must propagate to derived records such as stars, clusters, replays, insights, companion state, and notifications where launched.
- Deletion must handle failures, retries, partial completion, and audit logs.

### Acceptance criteria

- Deletion removes or legally handles mapped records for a test user.
- Derived records are deleted or invalidated.
- Job is idempotent.
- Failures are retryable and visible to operators.

## 5. Biometric deletion

### Required behavior

- Voice events and any biometric/identity-linked records must support separate biometric deletion.
- Biometric deletion must not require full account deletion.
- Biometric deletion must remove raw biometric/voice payloads and derived biometric metadata where applicable.

### Acceptance criteria

- A test user can request biometric-only deletion.
- Voice records are deleted or stripped according to policy.
- Future voice processing is disabled unless explicit consent is granted again.
- Audit events prove completion.

## 6. Explanation UI/API

### Required behavior

- Sensitive inference features must offer user-facing explanations.
- Required explanation features include insights, relationship scoring, behavior patterns, emotional trends, dream summaries, companion state, clusters, and replays where launched.
- Explanations must identify source categories and purpose without exposing unsafe internals.

### Acceptance criteria

- User can request an explanation for a generated sensitive insight.
- Explanation returns source categories, purpose, policy version, and user-rights options.
- Explanation request is audit logged.

## 7. Audit event emission

### Required behavior

Audit events must exist for:

- consent granted
- consent revoked
- processing blocked by missing consent
- memory created/deleted
- star created/deleted
- insight generated/viewed/deleted/explained
- export requested/completed/failed
- deletion requested/completed/failed
- biometric deletion requested/completed/failed
- admin/support access
- policy version change

### Acceptance criteria

- Tests verify audit event emission for each sensitive path.
- Audit events contain actor, user, action, scope, policy version, timestamp, and result.
- Audit logs are not editable by normal users or support roles.

## 8. Least-privilege admin/support access

### Required behavior

- Admin/support access to user privacy data is denied by default.
- Any allowed access must be role-gated, purpose-bound, time-bound, and audit logged.
- Sensitive content, voice/biometric data, emotional data, dream logs, and relationship inferences require stricter controls.

### Acceptance criteria

- Normal support users cannot access sensitive records.
- Authorized privacy operators can process requests without raw unrestricted database access.
- Every access event is audit logged.

## 9. Incident owner

### Required behavior

- Assign an owner for privacy incidents involving URAI Spatial.
- Define escalation path to privacy, security, legal, engineering, and support.
- Define breach triage and user notification decision flow.

### Acceptance criteria

- Owner and backup owner are named.
- Incident runbook exists and links to URAI Privacy incident response policy.
- Test tabletop or dry-run is documented.

## 10. Backup deletion and expiry behavior

### Required behavior

- Document how deleted user data ages out of backups.
- Document whether deletion is immediate, async, tombstoned, anonymized, or retained for legal hold.
- Define maximum backup retention window.

### Acceptance criteria

- Backup behavior is documented for Firestore, Storage, analytics exports, and any job queues.
- User-facing deletion language reflects actual backup behavior.
- Operators can explain backup deletion state during privacy requests.

## 11. GitHub Actions verification

### Required behavior

- Privacy adoption CI must pass on latest `main`.
- CI should verify required files, structured inventory, manifest directory, and explicit blocked/approved status.

### Acceptance criteria

- Latest privacy adoption workflow run is passing.
- Failing privacy adoption files block merges.
- CI result is linked in adoption report or release notes.

## 12. Schema validation

### Required behavior

- `privacy/data-inventory.yaml` and feature manifests should be validated against URAI Privacy schemas or equivalent validation scripts.
- Invalid data class, consent tier, retention class, export/deletion flags, or missing review status must fail validation.

### Acceptance criteria

- Schema validator runs in CI.
- Existing manifests pass validation or documented exceptions exist.
- Invalid fixture test proves CI fails bad manifests.

## 13. Product owner review

### Required behavior

- Product owner must confirm feature list, user-visible behavior, launch state, and product intent.

### Acceptance criteria

- Owner name is filled in `privacy/PRIVACY_VERSION.md` and adoption report.
- Review date is recorded.
- Open product questions are closed or tracked.

## 14. Privacy reviewer approval

### Required behavior

- Privacy reviewer must approve mapping, consent tiers, export/deletion behavior, sensitive inference explanation, audit events, and launch status.

### Acceptance criteria

- Reviewer name is filled in `privacy/PRIVACY_VERSION.md` and adoption report.
- Manifest decisions move only from blocked to approved after implementation evidence exists.
- Approval references test results.

## 15. Legal review where required

### Required behavior

Legal review is required for:

- biometric or voice processing
- sensitive inference
- minors or vulnerable users
- location processing
- data-sharing or monetization
- public privacy notices
- deletion/export wording

### Acceptance criteria

- Legal reviewer records approval or conditions.
- Required notice updates are tracked.
- Launch remains blocked until legal conditions are resolved.

## Current launch decision

Status: blocked.

URAI Spatial remains mapped but not approved. Completion requires implementation evidence, tests, CI verification, product review, privacy review, and legal review where required.
