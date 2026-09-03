# URAI Spatial Release-Manager Runbook

## Purpose

Provide the controlled procedure for attempting a live release of `LifeLoggerAI/urai-spatial` without weakening evidence standards.

## Current release posture

`NO-GO` until production Workload Identity Federation / managed ADC, least-privilege IAM, runtime identity read-back, historical key revocation, rollback evidence, and required signoffs are independently verified.

Long-lived Firebase service-account JSON, private keys, and Firebase CI tokens are prohibited in the canonical production path.

## Scope

This runbook governs release candidate SHA lock, non-deploying gate execution, identity verification, deployment, live smoke, evidence preservation, ledger update, and final go/no-go decision.

## Required Human Confirmations

Before execution mode:
- production Firebase / Google Cloud project ID
- intended live domain / URL
- release owner
- rollback owner
- deploy scope
- release candidate SHA
- approved production WIF/ADC service identity

## Required Tools / Access

- access to `LifeLoggerAI/urai-spatial`
- approved runner or workstation
- Node/pnpm runtime matching repo requirements
- GitHub Actions access if workflow dispatch is used
- Google Cloud/Firebase access through managed ADC or Workload Identity Federation
- artifact storage for logs and release evidence

## Required Repo Variables / Identity

Non-secret configuration:
- `URAI_SPATIAL_FIREBASE_PROJECT_ID`
- `URAI_SPATIAL_PRODUCTION_URL` when the default smoke URL is not appropriate

Production authentication:
- protected WIF provider configuration and a least-privilege workflow-specific service account, or provider-managed ADC in the production runtime
- `GOOGLE_APPLICATION_CREDENTIALS` may point only to a protected `external_account` configuration when a file-backed ADC configuration is required

Prohibited credential paths:
- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_TOKEN`

## Release Candidate SHA Lock Procedure

1. Select exact candidate SHA.
2. Record SHA in release control record.
3. Confirm all participants are using that SHA.
4. Reject gate, deploy, smoke, or ledger evidence referencing another SHA.
5. Do not proceed if any SHA mismatch exists.

## Identity Preflight

Before any production mutation:
1. Prove no prohibited long-lived credential variable is present.
2. Authenticate through approved WIF/managed ADC.
3. Confirm the active Google identity exactly matches the approved production service account.
4. Confirm project ID equals the approved production project.
5. Verify least-privilege IAM bindings.
6. Perform a non-mutating runtime read-back using the same identity.
7. Preserve a sanitized receipt containing identity email, project ID, workflow/run ID, timestamp, and result only; never store credential material.
8. Confirm historical user-managed keys scheduled for revocation are no longer required by validated workloads.

## Non-Deploying Release Gate Procedure

1. Check out the locked SHA.
2. Install dependencies using the documented repo process.
3. Run the canonical release verification and credential-boundary checks.
4. Preserve raw console output and summary artifact.
5. Record SHA, runner, timestamp, and pass/fail result.
6. If any gate fails, stop.

## Deploy Procedure

Deployment remains prohibited until the current quarantine workflow is intentionally replaced or re-enabled through a reviewed change that uses only the approved short-lived identity path.

When that change is approved:
1. Verify all non-deploying gates passed on the locked SHA.
2. Verify approved project and active WIF/ADC identity.
3. Execute only the approved deploy scope.
4. Preserve full deploy logs.
5. Record SHA, project ID, active service identity, deploy method, deploy scope, timestamp, and result.
6. If deploy fails, stop and preserve failure evidence.

## Live Smoke Procedure

1. Verify deploy completed for the locked SHA.
2. Verify intended live URL.
3. Run smoke against the public live URL.
4. Preserve smoke output and artifacts.
5. Record SHA, live URL, timestamp, and pass/fail result.

## Historical Credential Closure

Source removal is containment only. Provider closure requires:
1. inventory the current user-managed service-account keys;
2. map dependencies where evidence is available;
3. migrate workloads to WIF/managed ADC;
4. verify production/staging behavior without the target key;
5. disable the target key first;
6. verify no regression and verify old-key authentication fails;
7. delete the target key after the rollback window;
8. retain key ID/fingerprint and timestamps only, never the private key or JSON credential.

## Go / No-Go

A `GO` requires all of the following:
- execution mode explicitly approved;
- one locked release SHA;
- release gates pass on that SHA;
- approved WIF/ADC identity and least-privilege IAM proven;
- historical compromised-key closure proven;
- deploy completes from the locked SHA;
- live smoke passes;
- rollback evidence exists;
- required signoffs are complete;
- evidence ledger matches the same SHA and facts.

If any item is absent, classification remains `NO-GO`.

## Provider-Claim Safety

Do not claim a provider integration, AR/XR path, wearable integration, biometric capability, external-world action, or production delivery is live unless its provider-side activation and release evidence are independently verified.
