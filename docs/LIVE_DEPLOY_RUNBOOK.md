# URAI Spatial Live Deploy Runbook

## Current status

Production mutation is **QUARANTINED / NO-GO**.

The repository currently provides exact-source production verification and a main-only short-lived Google WIF identity proof, not a production deploy workflow.

`.github/workflows/spatial-live-deploy.yml` deliberately:

- verifies exact source and a clean tree;
- runs the release credential-boundary guards;
- records a NO-GO production-release classification;
- may exchange GitHub OIDC for a five-minute read-only Google access token on canonical `main`; and
- contains no production mutation command.

`scripts/live-release.mjs deploy` is intentionally fail closed. Do not bypass it with direct `firebase deploy`, interactive Firebase login, a Firebase token, service-account JSON, Vercel deployment, or another provider CLI path.

## Source readiness

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm live:check
```

Also require every release-candidate gate applicable to the exact source, including CI, security, privacy, accessibility, performance, literal visual acceptance, review, and governance.

## Current WIF proof

The main-only WIF job proves only that GitHub OIDC can be exchanged for the repository's configured short-lived read-only Google identity. It does not prove deployment IAM, provider mutation authority, runtime identity, deployed revision, or rollback.

Do not persist the resulting token or reinterpret the read-only proof as production authorization.

## Re-enabling production mutation

A future mutation workflow must be separately reviewed and fail closed unless it proves:

1. exact canonical `main` SHA and clean source;
2. protected production environment approval;
3. short-lived OIDC/WIF or explicitly approved managed identity;
4. exact authenticated principal and project;
5. resource-scoped least-privilege IAM with no Owner/Editor dependency;
6. historical long-lived credential revocation/negative-auth evidence where applicable;
7. reproducible deploy artifact bound to the source SHA;
8. explicit provider target and bounded mutation scope;
9. provider-native revision/source readback;
10. monitoring/log visibility and alert ownership; and
11. recovery plus rollback to a genuinely different known-good revision.

Until that workflow exists and all applicable release gates close, there is no authorized command in this runbook for Firebase Hosting, App Hosting, Functions, Firestore rules, or another production provider mutation.

## Existing-host smoke

Read-only smoke against an already reachable public host can be useful diagnostically, but a 200 response does not certify that the current source is deployed. Any live acceptance must be bound to a provider revision and exact source SHA.

## Rollback truth

A rollback counts only when protected provider authority restores a different known-good revision, the provider confirms that different revision, and live critical route/auth checks pass on it. `git revert`, documentation, or redeploying the same SHA is not operational rollback proof.
