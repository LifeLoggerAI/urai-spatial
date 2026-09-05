# URAI Spatial Production Audit

> **SUPERSEDED HISTORICAL AUDIT — NOT CURRENT RELEASE OR CREDENTIAL AUTHORITY.**
>
> This document records the repository state observed on May 7, 2026. Current canonical Spatial production mutation is quarantined. The current source authority is `DEPLOYMENT.md`, `ENVIRONMENT.md`, `docs/LIVE_DEPLOY_RUNBOOK.md`, and the fail-closed release workflows. Do not use any historical service-account, Firebase CLI, Stripe-live, or direct-deploy instruction from this audit as current authority.

Date: 2026-05-07
Scope: Historical verification and correction pass only. No new product features.

## Historical summary

Historical status at the time: CONDITIONAL PASS.

The May audit observed SaaS server pieces under the `urai-tier1` Next.js app, including entitlement API, Stripe checkout/webhook code, Firestore entitlement persistence, and package dependencies. Those source observations did not prove a protected provider deployment, live payment authority, or current production certification.

## Historical observations retained for audit history

### Runtime app root

Root scripts build and run `urai-tier1` with `pnpm --filter urai-tier1 ...`, so production-facing Next.js routes are expected under `urai-tier1/src/app` rather than root `src/app`.

### Tier-1 dependencies

The observed `urai-tier1/package.json` included Firebase client/Admin, Stripe, and Node typing dependencies required by the server routes.

### Checkout identity binding

The observed checkout route verified Firebase identity server-side and derived the user ID from the decoded token rather than trusting a client-provided user ID.

### Entitlement API

The observed entitlement route required an Authorization bearer token, verified it with Firebase Admin, and returned only the authenticated user's entitlement.

### Stripe webhook persistence

The observed Tier-1 Stripe webhook verified signatures, validated supported plan metadata, resolved user/customer identity, and wrote entitlement state through the Tier-1 entitlement store.

### Webhook-v2 compatibility

The observed `/api/stripe/webhook-v2` route re-exported the hardened Tier-1 webhook handler.

### Root duplicate

The root `src/...` SaaS surface was already identified as a duplicate/non-runtime risk. Current release authority remains `urai-tier1`; root duplicate code must not regain canonical runtime or credential authority.

## Current credential and deployment correction

The May audit's former recommendation to use `FIREBASE_SERVICE_ACCOUNT_JSON`, raw/base64 service-account keys, interactive Firebase CLI login, or another user-managed long-lived Google credential is **superseded and prohibited for current production authority**.

Current truth:

- canonical production mutation is quarantined;
- `.github/workflows/spatial-live-deploy.yml` performs exact-source verification and may prove a short-lived read-only WIF identity on canonical `main`, but contains no production deployment command;
- `scripts/live-release.mjs deploy` remains fail closed;
- no current local Firebase/Vercel/direct-provider production deploy path is authorized;
- if production mutation is later re-enabled, it must use separately reviewed protected exact-main authority with short-lived OIDC/WIF or another explicitly approved managed identity, least-privilege IAM, exact provider revision/source-SHA readback, monitoring, recovery, and distinct-revision rollback evidence;
- Google-managed runtime identity must use attached ADC/managed identity rather than a downloaded private key.

## Current external/provider gates

Repository source alone cannot close these current gates:

- protected WIF/provider trust and least-privilege IAM;
- exact production project/resource authority;
- authenticated provider deployment through separately reviewed authority;
- provider-native deployed revision and exact source-SHA readback;
- positive and denied-auth/tenant/privacy checks;
- Stripe account security and explicit test-to-production activation authority;
- correct protected Stripe secrets and signed webhook delivery;
- legal/operator/banking authority before live commerce;
- monitoring/log visibility and alert ownership;
- recovery exercise;
- rollback to a genuinely different known-good revision with provider and live readback.

## Current source verification expectations

For an active release candidate, require the applicable exact-head install/typecheck/build/unit/security/privacy/accessibility/performance/visual/governance matrix. Source checks are necessary but do not establish deployment.

For billing-related source, current Tier-1 Stripe work must remain fail closed until its dedicated exact-head review/provider/test-mode E2E gates close. No historical May checkout/webhook observation authorizes live-mode charging.

## Historical risk notes retained

The May audit identified lockfile freshness, unexecuted build/typecheck, duplicate root source, and local insight persistence as risks. Each must be re-evaluated against the active exact source rather than assumed current.

## Current decision rule

This historical audit does **not** certify the current product, billing system, deployment, provider identity, or live runtime. Current launch status must be derived only from fresh exact-head source evidence plus provider-native deployment/readback, independent review where required, account/legal authority, monitoring, recovery, and distinct rollback evidence.
