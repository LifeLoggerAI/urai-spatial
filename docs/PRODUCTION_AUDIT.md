# URAI Spatial Production Audit

Date: 2026-05-07
Scope: Verification and correction pass only. No new product features.

## Historical snapshot warning

This file is a May 7, 2026 historical implementation audit, **not current deployment or credential authority**. Current release truth must come from the live launch manifest, exact-head GitHub/provider evidence, and the keyless deployment runbooks. Do not infer that routes described here are currently deployed. Long-lived Firebase service-account JSON/private-key/token credentials are prohibited for the canonical production path.

## Summary

Status: CONDITIONAL PASS

The core SaaS server pieces now exist in the deployed `urai-tier1` Next.js app: secure entitlement API, Stripe checkout, Stripe webhook, Stripe webhook-v2 alias, Firestore entitlement persistence, and package dependencies required by those routes. Production launch still depends on a deployment smoke test with real Firebase, Stripe, and hosting environment variables.

## Verified / Corrected in this pass

### PASS: Runtime app root confirmed

Root scripts build and run `urai-tier1` with `pnpm --filter urai-tier1 ...`, so production-facing Next.js routes must live under `urai-tier1/src/app` rather than root `src/app`.

### PASS: Tier1 dependencies updated

`urai-tier1/package.json` now includes:

- `firebase`
- `firebase-admin`
- `stripe`
- `@types/node`

This addresses missing import/runtime risks for Firebase client, Firebase Admin, Stripe routes, and Node globals in server route typechecking.

### PASS: Checkout identity binding hardened in deployed app

`urai-tier1/src/app/api/stripe/create-checkout-session/route.ts` verifies a Firebase ID token server-side and derives the user ID from the decoded token. It does not trust a client-provided user ID for Stripe metadata.

### PASS: Entitlement API hardened in deployed app

`urai-tier1/src/app/api/entitlement/route.ts` requires an Authorization bearer token, verifies it with Firebase Admin, and returns only the authenticated user's entitlement.

### PASS: Stripe webhook persistence exists in deployed app

`urai-tier1/src/app/api/stripe/webhook/route.ts` verifies Stripe signatures, validates supported plan metadata, resolves user/customer identity, and writes Firestore entitlements through `urai-tier1/src/lib/entitlementStore.ts`.

### PASS: Documented webhook-v2 endpoint exists

`urai-tier1/src/app/api/stripe/webhook-v2/route.ts` re-exports the hardened webhook handler, so the documented endpoint `/api/stripe/webhook-v2` resolves in the deployed app.

### PASS: Root stale webhook-v2 route neutralized

Root `src/app/api/stripe/webhook-v2/route.ts` now delegates to the hardened root webhook implementation instead of retaining older unsafe defaults.

## Remaining external launch requirements

These cannot be completed inside the repository alone:

- Create/verify Firebase project.
- Enable Firebase Auth Email/Password provider.
- Enable Firestore.
- Establish separately reviewed short-lived OIDC/WIF or managed runtime ADC with least-privilege IAM; do not configure service-account JSON/private-key/token credentials.
- Create Stripe products/prices.
- Add Stripe webhook endpoint to `/api/stripe/webhook-v2`.
- Add all hosting environment variables.
- Deploy and run a real Stripe test payment.
- Confirm Firestore writes `userEntitlements/{uid}` after checkout.
- Confirm the report UI unlocks after entitlement refresh.

## Known risks to verify during deploy

### RISK: Lockfile must be regenerated

`urai-tier1/package.json` was updated to include server billing dependencies. `pnpm-lock.yaml` must be regenerated with `pnpm install` before final merge/release if the current lockfile importer section is stale.

### RISK: TypeScript/build not executed in this connector pass

This audit did not run a live `pnpm build` or `pnpm typecheck` against the repository. Final production readiness requires CI or local build verification.

### RISK: Root `src` SaaS duplicate remains

Root `src/...` contains an older parallel SaaS surface. Runtime scripts currently build `urai-tier1`; future cleanup should either delete the root duplicate or explicitly mark it as non-runtime to avoid confusion.

### RISK: Credential authority drift

Do not use service-account JSON, private keys, Firebase tokens, or base64-wrapped long-lived credentials as a workaround. Production identity must remain short-lived OIDC/WIF or an explicitly approved managed runtime identity with provider-native readback.

### RISK: Local insight persistence

Life Map insight history is still stored in localStorage. This is acceptable for initial client-local reporting, but cross-device paid reports require a Firestore-backed insight ledger.

## Launch gate checklist

Production launch should proceed only after:

- [ ] `pnpm install` succeeds and updates/verifies `pnpm-lock.yaml`.
- [ ] `pnpm --filter urai-tier1 typecheck` succeeds.
- [ ] `pnpm --filter urai-tier1 build` succeeds.
- [ ] `/spatial` renders in the deployed app.
- [ ] `/api/entitlement` returns 401 without token.
- [ ] `/api/entitlement` returns the authenticated user's entitlement with token.
- [ ] Stripe checkout requires signed-in user.
- [ ] Stripe checkout session metadata includes authenticated UID.
- [ ] Stripe webhook-v2 returns 200 for test events.
- [ ] Firestore writes `userEntitlements/{uid}` after payment.
- [ ] Paid report panels remain locked before payment.
- [ ] Paid report panels unlock after entitlement update.

## Final decision

Conditional pass for repository-side implementation. Not yet a verified production launch until install, typecheck, build, deployment, Stripe, Firebase, and entitlement smoke tests pass.
