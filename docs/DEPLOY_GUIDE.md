# URAI Spatial Deploy Guide

## 1. Runtime app root

The canonical Next.js app root is `urai-tier1`.

Root verification scripts delegate to that package. Validate current release source against `urai-tier1`, not the superseded root `src` tree.

## 2. Current deployment truth

Production mutation is currently **quarantined**.

The workflow named `URAI Canonical Production Release Verification` in `.github/workflows/spatial-live-deploy.yml` is verification-only despite the historical filename. It can verify source and prove a short-lived read-only WIF identity on canonical `main`; it does not deploy Firebase Hosting, App Hosting, Functions, Firestore rules, Vercel, Stripe, or another provider.

The package `live:deploy` path intentionally refuses production mutation. Do not replace that refusal with a local CLI deployment or long-lived credential.

## 3. Local source verification

```bash
pnpm install --frozen-lockfile
pnpm --filter urai-tier1 typecheck
pnpm --filter urai-tier1 build
pnpm --filter urai-tier1 test:unit
pnpm launch:check
pnpm live:check
```

These checks do not establish deployment, live runtime identity, provider revision, monitoring, recovery, or rollback.

## 4. Environment and credential boundary

Use `urai-tier1/.env.example` and `ENVIRONMENT.md` for current non-secret configuration guidance.

Do not provision or document these as production authority:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_TOKEN`
- downloaded Google service-account JSON
- authorized-user ADC
- interactive local Firebase login

Provider/model/Stripe secrets belong in protected provider/environment secret storage only when the relevant capability is explicitly authorized.

## 5. Stripe boundary

Local/test-mode Stripe work remains separate from production commerce authority. This guide does not authorize:

- switching the account or app to live mode;
- creating or promoting live products/prices;
- production checkout activation;
- production webhook creation;
- real customer charging.

Any future production activation requires verified account security, legal/operator authority, settlement banking, correct protected secrets, webhook/runtime proof, monitoring, recovery, and distinct rollback.

## 6. Future protected hosting

If production mutation is re-enabled, the deployment authority must be separately source-reviewed and must require at minimum:

- exact canonical `main` SHA;
- protected environment approval;
- short-lived OIDC/WIF or explicitly approved managed identity;
- least-privilege project/resource IAM;
- immutable/reproducible artifact identity;
- exact provider revision/source readback;
- no user-managed private key or Firebase CLI token.

Do not infer that Firebase Hosting, App Hosting, Vercel, or another host is authorized merely because the app can build for it.

## 7. Post-deploy verification

After a future authorized deployment, prove against the exact provider revision:

- canonical routes and health;
- positive authenticated behavior;
- unauthenticated and cross-user/cross-tenant denial;
- privacy and destructive-operation boundaries;
- critical accessibility behavior;
- literal release visuals;
- monitoring/log visibility and alert owner;
- recovery procedure; and
- rollback to a different known-good revision with provider and live readback.

## 8. Status rule

Until those conditions are met, source may be classified as verified or release-candidate quality where evidence supports it, but production deployment remains **NO-GO / QUARANTINED**.
