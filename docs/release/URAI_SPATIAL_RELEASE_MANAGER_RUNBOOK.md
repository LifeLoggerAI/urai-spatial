# URAI Spatial Release-Manager Runbook

## Purpose

Provide the controlled procedure for attempting a live release of `LifeLoggerAI/urai-spatial` without weakening evidence standards.

## Scope

This runbook governs:
- release candidate SHA lock
- non-deploying gate execution
- deployment
- live smoke
- evidence preservation
- ledger update
- final go/no-go decision

## Non-Goals

This runbook does not authorize:
- implementation work
- code changes
- secret creation or modification
- deploy scope expansion
- test skipping
- verbal-only release validation

## Planning Mode vs Execution Mode

Planning mode:
- documentation, issue drafting, evidence review, release control
- no changes to systems or repo state

Execution mode:
- requires explicit approval
- allows running gate, deploy, smoke, and ledger update only within approved scope

## Required Human Confirmations

Before execution mode:
- production Firebase project ID
- intended live domain / URL
- release owner
- rollback owner
- whether Firebase Functions are in scope for first live publish
- deploy scope: hosting only vs hosting + Firestore rules/indexes + functions
- release candidate SHA

## Required Tools / Access

- access to `LifeLoggerAI/urai-spatial`
- approved runner or workstation
- Node/pnpm runtime matching repo requirements
- GitHub Actions access if workflow dispatch is used
- Firebase deploy credentials
- artifact storage location for logs and release evidence
- access to inspect `release/LIVE_STATUS.md`

## Required Repo Variables / Secrets

Evidence-based required inputs:
- `URAI_SPATIAL_FIREBASE_PROJECT_ID` or workflow input equivalent
- one credential path:
  - `FIREBASE_SERVICE_ACCOUNT`
  - `FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL`
  - `FIREBASE_TOKEN`

## Release Candidate SHA Lock Procedure

1. Select exact candidate SHA.
2. Record SHA in release control record.
3. Confirm all participants are using that SHA.
4. Reject any gate, deploy, smoke, or ledger evidence that references another SHA.
5. Do not proceed if any SHA mismatch exists.

Critical rule:
- live verification is invalid unless gate, deploy, smoke, and ledger all reference the same locked SHA.

## Preflight Checklist

1. Confirm planning mode has ended and execution mode is explicitly approved.
2. Confirm release candidate SHA is locked.
3. Confirm production Firebase project ID.
4. Confirm intended live URL.
5. Confirm release owner and rollback owner.
6. Confirm deploy scope.
7. Confirm functions scope.
8. Confirm required secrets/vars exist.
9. Confirm artifact preservation path.
10. Confirm `release/LIVE_STATUS.md` still reflects pre-release truth.
11. Confirm no unresolved committed secret exists.
12. Confirm provider-claim posture remains disabled/fallback-only.

## Non-Deploying Release Gate Procedure

1. Check out the locked SHA.
2. Install dependencies using the documented repo process.
3. Run `pnpm live:check`.
4. Preserve raw console output and summary artifact.
5. Record SHA, runner, timestamp, and pass/fail result.
6. If the gate fails, stop and document the failure.

Rules:
- do not skip the gate
- do not rely on verbal confirmation
- do not substitute a different SHA

## Deploy Procedure

1. Verify gate passed on the locked SHA.
2. Verify approved Firebase project target.
3. Verify approved deploy credential path.
4. Execute deploy using approved workflow or runner.
5. Preserve full deploy logs.
6. Record SHA, project ID, deploy method, deploy scope, timestamp, and result.
7. If deploy fails, stop and preserve failure evidence.

## Live Smoke Procedure

1. Verify deploy completed for the locked SHA.
2. Verify intended live URL.
3. Run smoke against the public live URL.
4. Preserve smoke output and artifacts.
5. Record SHA, live URL, timestamp, and pass/fail result.
6. If smoke fails, no live-verification claim is allowed.

## Evidence Artifact Capture Procedure

Preserve at minimum:
- release gate logs
- deploy logs
- smoke logs
- CI/job URLs where applicable
- SHA reference for each artifact
- timestamp for each artifact
- operator identity
- final evidence summary

Minimum rule:
- a `GO` requires at least one preserved artifact for the passing release gate
- a `GO` requires at least one preserved artifact for the passing live smoke run

## Live-Status Ledger Update Procedure

1. Confirm gate, deploy, smoke, and ledger all map to one locked SHA.
2. Confirm all required fields are known.
3. Update `release/LIVE_STATUS.md` only after proof exists.
4. Recheck ledger against evidence bundle.
5. If any mismatch remains, do not change status to live-verified.

## Go / No-Go Decision Tree

1. Is execution mode explicitly approved?
   - if no: `NO-GO`
2. Is one release candidate SHA locked?
   - if no: `NO-GO`
3. Did `pnpm live:check` pass on that SHA?
   - if no: `NO-GO`
4. Did deploy complete from that SHA to the approved Firebase target?
   - if no: `NO-GO`
5. Did live smoke pass on the approved live URL for that release?
   - if no: `NO-GO`
6. Are preserved artifacts available for gate and smoke?
   - if no: `NO-GO`
7. Does `release/LIVE_STATUS.md` match the same SHA and recorded facts?
   - if no: `NO-GO`
8. Are provider claims still disabled/fallback-only unless validated?
   - if no: `NO-GO`
   - if yes: `GO`

Current decision:
- `NO-GO`

## Rollback Plan

If deploy or smoke fails:
1. Stop release claim immediately.
2. Notify release owner and rollback owner.
3. Revert to last known good deployment method if one exists.
4. Preserve failure evidence before further state changes.
5. Record rollback decision and operator.
6. Reopen release only after a new candidate SHA is selected or failure is resolved.

Human confirmation required:
- exact existing rollback mechanism: evidence not found
- rollback owner authority: human confirmation required

## Failure Handling

If gate fails:
- no deploy
- triage and document only verified release-gate failures
- no implementation without explicit approval

If deploy fails:
- preserve logs
- confirm environment target
- confirm credential path
- decide rollback or retry only under approved execution mode

If smoke fails:
- treat release as unverified
- preserve artifacts
- assess whether rollback is required
- do not update live ledger to verified

If SHA mismatch appears:
- invalidate evidence bundle
- restart from release commit lock

If committed secret is found:
- escalate to P0 immediately
- freeze release path until handled

## Provider-Claim Safety Check

Before any launch communication:
- no public claim says AR is live unless validated
- no public claim says WebXR is live unless validated
- no public claim says wearables are live unless validated
- no public claim says biometrics are live beyond privacy-safe fallback
- no public claim says memory grounding is live beyond demo/fallback

## Final Launch Communication Checklist

1. Confirm final go decision exists.
2. Confirm locked SHA is documented.
3. Confirm live URL is correct.
4. Confirm wording does not overclaim provider capability.
5. Confirm known issues are documented.
6. Confirm release owner approved the message.
7. Confirm rollback owner is aware of release state.

## Post-Launch Verification Checklist

1. Recheck live URL manually.
2. Recheck smoke-critical routes.
3. Confirm system endpoints respond.
4. Confirm ledger remains accurate.
5. Confirm release artifacts are stored.
6. Confirm any follow-up issues are logged.
7. Confirm no accidental overclaim entered docs or launch messaging.
