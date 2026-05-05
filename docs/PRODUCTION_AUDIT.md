# URAI Spatial Production Audit

Date: 2026-05-05
Scope: Verification and correction pass only. No new product features.

## Summary

Status: CONDITIONAL PASS

The core SaaS pieces are present in the repository: Firebase auth UI, secure entitlement API, Stripe checkout, Stripe webhook, Firestore entitlement persistence, spatial page shell, and gated report panel. The repository is close to launch readiness, but production launch still depends on an external deployment smoke test with real Firebase, Stripe, and hosting environment variables.

## Verified / Corrected in this pass

### PASS: Root dependencies updated

Root `package.json` now includes:

- `firebase`
- `firebase-admin`
- `stripe`

This addresses previous missing import/runtime risks for Firebase client, Firebase Admin, and Stripe routes.

### PASS: Checkout identity binding hardened

`src/app/api/stripe/create-checkout-session/route.ts` now verifies a Firebase ID token server-side and derives the user ID from the decoded token. It no longer trusts a client-provided user ID for Stripe metadata.

### PASS: Entitlement API hardened

`src/app/api/entitlement/route.ts` requires an Authorization bearer token, verifies it with Firebase Admin, and returns only the authenticated user's entitlement.

### PASS: Stripe plan gate restored

`src/components/spatial/stripePlanGate.ts` exports the plan config, entitlement type, `canAccessPlan`, lock messaging, local free fallback, and authenticated checkout helper.

### PASS: Entitlement hook uses ID token

`src/hooks/useUserEntitlement.ts` now listens for Firebase auth state, fetches a Firebase ID token, calls `/api/entitlement` with `Authorization: Bearer <token>`, and exposes loading/error/anonymous/authenticated states.

### PASS: Report panel is gated

`src/components/spatial/InsightReportPanel.tsx` now blocks paid report rendering/export unless `canAccessPlan(entitlement, planId)` passes.

### PASS: Auth UI exists

`src/components/spatial/AuthPanel.tsx` provides email/password sign-up, sign-in, sign-out, and entitlement refresh after authentication.

### PASS: Spatial shell exists

`src/app/spatial/page.tsx` mounts the auth panel, Life Map scene, and report panels.

## Remaining external launch requirements

These cannot be completed inside the repository alone:

- Create/verify Firebase project.
- Enable Firebase Auth Email/Password provider.
- Enable Firestore.
- Add `FIREBASE_SERVICE_ACCOUNT_JSON` as a production secret.
- Create Stripe products/prices.
- Add Stripe webhook endpoint to `/api/stripe/webhook-v2`.
- Add all hosting environment variables.
- Deploy and run a real Stripe test payment.
- Confirm Firestore writes `userEntitlements/{uid}` after checkout.
- Confirm the report UI unlocks after entitlement refresh.

## Known risks to verify during deploy

### RISK: App package placement

The repository appears to use a monorepo/script structure (`pnpm --filter urai-tier1 ...`). The files added in `src/...` assume the root is the Next.js app root. If the true runtime app root is inside a package such as `urai-tier1`, these files may need to be moved under that package.

### RISK: TypeScript/build not executed in this pass

This audit did not run a live `pnpm build` or `pnpm typecheck` against the repository. Final production readiness requires CI or local build verification.

### RISK: Duplicate webhook route

The production endpoint should be `/api/stripe/webhook-v2`. If an older `/api/stripe/webhook` route remains, do not configure Stripe to point to it. Prefer deleting or redirecting the old route in a future cleanup pass after confirming file SHA.

### RISK: Service account env formatting

`FIREBASE_SERVICE_ACCOUNT_JSON` must be valid JSON in the hosting environment. If newline escaping causes deployment failure, convert to a base64-based secret in a future hardening pass.

### RISK: Local insight persistence

Life Map insight history is still stored in localStorage. This is acceptable for initial client-local reporting, but cross-device paid reports require a Firestore-backed insight ledger.

## Launch gate checklist

Production launch should proceed only after:

- [ ] `pnpm install` succeeds.
- [ ] `pnpm build` succeeds.
- [ ] `/spatial` renders in the deployed app.
- [ ] Email/password signup works.
- [ ] `/api/entitlement` returns 401 without token.
- [ ] `/api/entitlement` returns the authenticated user's entitlement with token.
- [ ] Stripe checkout requires signed-in user.
- [ ] Stripe checkout session metadata includes authenticated UID.
- [ ] Stripe webhook-v2 returns 200 for test events.
- [ ] Firestore writes `userEntitlements/{uid}` after payment.
- [ ] Paid report panels remain locked before payment.
- [ ] Paid report panels unlock after entitlement update.

## Final decision

Conditional pass for repository-side implementation. Not yet a verified production launch until build, deployment, Stripe, Firebase, and entitlement smoke tests pass.
