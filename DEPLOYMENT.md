# URAI Spatial Deployment

## Current release authority

URAI Spatial production mutation is currently **QUARANTINED / NO-GO** in canonical source.

The deployed application root is `urai-tier1`, but source existence, a passing build, a reachable historical Firebase URL, or a short-lived identity proof does not authorize a deployment.

`.github/workflows/spatial-live-deploy.yml` is intentionally verification-only. It:

- checks the exact source SHA and clean tree;
- runs the canonical source/release checks;
- verifies that production mutation remains fail closed;
- may exchange GitHub OIDC for a short-lived, read-only Google WIF identity on `main`;
- records a NO-GO release receipt; and
- exposes **no** production deployment command.

The package `live:deploy` path is also deliberately quarantined. Do not bypass that boundary with local Firebase CLI authentication, Vercel deployment, a Firebase CLI token, service-account JSON, or another provider credential.

## Local verification

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm launch:check
pnpm live:check
```

Run additional exact-head CI, security, privacy, accessibility, performance, visual, and governance gates required by the active release candidate. Passing these source checks is necessary but not sufficient for deployment.

## Credential boundary

Allowed current production-proof behavior is short-lived identity verification only. Do not configure or use:

```txt
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_TOKEN
```

Do not commit downloaded service-account JSON, authorized-user ADC, provider tokens, Stripe secrets, or other credentials.

If production deployment is re-enabled later, it must be through a separately reviewed protected workflow on exact canonical `main`, with protected environment approval, short-lived WIF/managed identity, least-privilege IAM, exact project/resource targeting, reproducible artifact identity, and no user-managed private key.

## Existing public runtime

The existence of `https://urai.app`, `https://urai-4dc1d.web.app`, or another reachable host does not establish that the current candidate SHA is deployed. Live certification requires provider-native revision evidence and exact source-SHA readback.

## Future protected deployment acceptance

A future production deployment is not accepted until all applicable gates are proven on the unchanged certified source:

1. required exact-head workflows terminal-success;
2. zero unresolved review threads;
3. eligible independent exact-head approval where governance requires it;
4. literal retained-pixel and accessibility acceptance;
5. protected keyless provider identity and least-privilege IAM;
6. exact deployment workflow run and provider revision;
7. exact deployed source SHA readback;
8. positive authorization and denied-auth/tenant/privacy checks;
9. monitoring/log visibility and alert ownership;
10. exercised recovery; and
11. rollback to a genuinely different known-good revision with live readback.

## Commerce boundary

This document does not authorize Stripe live mode, live products/prices, production webhook creation, checkout activation, or customer charging. Commerce remains separately gated by account security, legal/operator authority, settlement banking, provider configuration, test-mode evidence, monitoring, recovery, and distinct rollback.

## Release status rule

Do not call a current candidate deployed or production-live merely because source CI is green. Until a separately authorized protected deployment exists and exact provider readback proves the deployed SHA, classify the production mutation path as **NO-GO / QUARANTINED**.
