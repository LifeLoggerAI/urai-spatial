# URAI Controlled Beta Execution Control

Operational tracker: issue `#496`  
Release dependency: issue `#461`  
Machine-readable state: `release/beta-execution-state.json`

## Current decision

**NO-GO for live cohort enrollment.**

The beta materials, tester journey, feedback forms, severity model, metrics, and go/no-go process exist, but the known public deployment is not linked to an exact current SHA and current Status/Privacy Controls parity receipts. Real-user sensitive data is not authorized.

Safe work that may proceed while blocked:

- recruit a prospective tester list outside the public repository;
- rehearse the sample-data journey with internal operators;
- review wording, accessibility, and device setup using committed offline assets;
- prepare scheduling and support coverage;
- run static verification against source;
- use synthetic sample data only.

## Start gate

Change `release/beta-execution-state.json` from `blocked` to `ready` only after all of these are recorded:

1. Exact 40-character tested and deployed `main` SHA.
2. Distinct proven rollback SHA and rollback command.
3. Immutable deployment receipt.
4. Current `/status` route showing the same deployment truth.
5. Dedicated `/privacy-controls` source parity.
6. Route, slash, query, missing-resource, console, desktop, and mobile smoke.
7. Required exact-head CI success.
8. Zero open P0 issues on the enabled surface.
9. Sample-data disclosure visible on the beta entry path.
10. Named beta operator, incident owner, and backup owner.

No raw page-view count or reachable route may substitute for this gate.

## Cohort operation

Target 15-30 testers in three groups:

- first-time clarity testers;
- testers with one defined, low-risk use-case hypothesis;
- privacy, accessibility, safety, security, and product reviewers.

Use the journey from `BETA_TESTER_PACKET.md` and the public issue forms. Do not store participant names, email addresses, medical details, or other private information in a public issue. Keep invitation and consent records in an approved private system.

The enabled test remains sample-data-only. Do not ask testers to enter medical, legal, financial, biometric, credential, precise-location, or private third-party information.

## Exact-build receipt

Create one receipt per cohort run:

```text
Beta run ID:
Exact tested SHA:
Exact deployed SHA:
Rollback SHA:
Deployment receipt:
Live base URL:
Start time and timezone:
End time and timezone:
Operator:
Incident owner:
Backup owner:
Allowed routes:
Disabled capabilities:
Data mode: synthetic sample only
Tester count by group:
P0 issues:
P1 issues:
Journey completion:
Correct product comprehension:
Sample-data comprehension:
Permission/control comprehension:
Return intent:
Candidate wedge signal:
Decision: GO / LIMITED GO / NO-GO
Evidence links:
```

Every bug and feedback report must identify the run ID and exact build when known.

## Stop conditions

Stop the cohort immediately when any of these occur:

- private or cross-user information appears;
- authentication, Passport, or permission controls are bypassed;
- the live SHA is unknown or differs from the receipt;
- Status or Privacy Controls serves stale or incorrect content;
- a core route is consistently unavailable;
- sample-data disclosure disappears;
- medical, certainty, surveillance, autonomous-action, provider-active, device-certified, or production-certified overclaims appear;
- there is no verified rollback path;
- a P0 issue is opened against the enabled surface.

After a stop, preserve only redacted technical evidence, disable enrollment, and record the exact build and reason.

## Completion evidence

A cohort is complete only when:

- the exact-build receipt is filled;
- all P0/P1 findings have an owner and decision;
- sample-safety and trust-comprehension findings are summarized;
- the chosen wedge remains explicitly a hypothesis unless repeat-use evidence supports it;
- expansion or payment decisions cite actual behavior rather than raw traffic;
- the go/no-go decision is recorded.

## External blockers

### Protected deployment and live parity

- **Blocked task:** start the 15-30 person live cohort.
- **Why blocked:** no current exact deployed-SHA, rollback, Status parity, Privacy Controls parity, and complete custom-domain smoke receipt exists.
- **Owner:** canonical release-control owner tracked in `#461`.
- **Smallest action:** run the protected canonical release for one frozen `main` SHA with a proven rollback SHA and attach all receipts.
- **Already complete:** tester packet, issue forms, route matrix, severity model, metrics, machine-readable fail-closed state, and run receipt.
- **Immediate follow-up:** update the state file with exact receipts, run the start-gate review, then schedule only the approved sample-data cohort.

### GitHub Actions capacity

- **Blocked task:** obtain exact-head CI and generated browser evidence for the candidate build.
- **Why blocked:** required repository jobs are queued without runner capacity.
- **Owner:** repository or organization Actions/billing/runner administrator.
- **Smallest action:** restore runner capacity so the queued exact-head workflows execute.
- **Already complete:** source-side checks and fail-closed control files.
- **Immediate follow-up:** inspect exact-head results, fix candidate-caused failures, and attach the successful workflow IDs to the beta receipt.

### Real-user data

- **Blocked task:** enable sensitive or persistent personal-memory testing.
- **Why blocked:** authenticated ownership, tenant isolation, export, deletion, revocation, retention, audit, and live privacy evidence are not complete.
- **Owner:** identity/privacy/security workstream owner with appropriate legal review.
- **Smallest action:** prove each enabled data path end to end and obtain the required review.
- **Already complete:** sample-data-only test design and explicit prohibited-data instructions.
- **Immediate follow-up:** create a separate reviewed data-enabled beta scope; do not silently expand this cohort.
