# URAI Spatial Production Audit

Historical audit record; its conditional-pass statements and setup checklist are
not current release authority. The canonical release workflow and operator quarantine
production mutation as NO-GO. Follow the current WIF credential boundary, Stripe TEST-only
boundary, independent review, protected-environment, provenance and rollback requirements.

Date: 2026-05-07
Scope: Verification and correction pass only. No new product features.

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
- Verify the protected external-account Workload Identity Federation configuration referenced by `GOOGLE_APPLICATION_CREDENTIALS`; do not provision a service-account key.
- Preserve Stripe TEST-mode product/price fixtures for lifecycle verification; Stripe LIVE remains disabled until separately authorized.
- Add Stripe webhook endpoint to `/api/stripe/webhook-v2`.
- Add all hosting environment variables.
- Deploy only when governed authority permits and run a Stripe TEST-mode lifecycle verification.
- Confirm Firestore writes `userEntitlements/{uid}` after checkout.
- Confirm the report UI unlocks after entitlement refresh.

## Known risks to verify during deploy

### RISK: Lockfile must be regenerated

`urai-tier1/package.json` was updated to include server billing dependencies. `pnpm-lock.yaml` must be regenerated with `pnpm install` before final merge/release if the current lockfile importer section is stale.

### RISK: TypeScript/build not executed in this connector pass

This audit did not run a live `pnpm build` or `pnpm typecheck` against the repository. Final production readiness requires CI or local build verification.

### RISK: Root `src` SaaS duplicate remains

Root `src/...` contains an older parallel SaaS surface. Runtime scripts currently build `urai-tier1`; future cleanup should either delete the root duplicate or explicitly mark it as non-runtime to avoid confusion.

### RISK: Unsupported or long-lived ADC credentials

The current runtime requires `GOOGLE_APPLICATION_CREDENTIALS` to reference a
protected, readable, regular, non-symlinked `external_account` configuration.
Service-account JSON, private keys and Firebase CI tokens are prohibited; encoding
a key as base64 does not change that prohibition. Never log or retain credential
material as release evidence.

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
