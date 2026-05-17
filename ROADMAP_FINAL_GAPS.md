# URAI Spatial Final Gaps Roadmap

Date: 2026-05-16
Purpose: Document only the gaps that cannot be honestly closed from repository edits alone.

## Ground rule

This file is not a feature wishlist. It is the final gap ledger for items that require local/CI execution, production secrets, external provider setup, device validation, or intentional future product work before URAI Spatial can be called fully production-live.

## Blocker gaps before production-live claim

### 1. Local or CI verification required

Status: Blocked in connector-only environment.

Required commands:

```bash
pnpm install
pnpm check:spatial
pnpm typecheck
pnpm build
HOST=http://127.0.0.1:3000 pnpm smoke
pnpm test:e2e
pnpm audit:tier-one
pnpm live:check
```

Exit criterion: every command exits successfully or has a documented, non-production-blocking reason.

### 2. Firebase project and rules deployment

Status: External provider setup required.

Required work:

- Select production Firebase project.
- Enable Firebase Auth provider(s).
- Enable Firestore.
- Configure Hosting or App Hosting.
- Deploy Firestore rules.
- Validate owner/tenant scoping with rules tests.
- Add Firebase public variables and Admin credentials in secret storage.

Exit criterion: production deployment can read/write only allowed owner/tenant-scoped documents and system APIs do not expose secrets.

### 3. Stripe entitlement verification

Status: External provider setup required.

Required work:

- Create Stripe products/prices.
- Configure checkout price IDs.
- Configure `/api/stripe/webhook-v2` endpoint.
- Add webhook signing secret.
- Run test checkout.
- Confirm Firestore entitlement write.
- Confirm UI unlocks only after entitlement refresh.

Exit criterion: real Stripe test payment updates `userEntitlements/{uid}` and entitlement-gated panels behave correctly.

### 4. Live-provider consent and provenance

Status: Required before live biometric/memory/XR providers.

Required work:

- Add explicit user consent capture for live providers.
- Log consent state and provider status.
- Add insight provenance for any memory-grounded or causal claim.
- Add retention and deletion behavior.
- Add safe-mode rendering for spatially sensitive content.

Exit criterion: provider data cannot enter live flows without consent, provenance, and scoped storage.

### 5. Device/XR validation

Status: Hardware/browser/provider validation required.

Required work:

- Run XR contract checks.
- Run navmesh bake.
- Run Quest/device validation where applicable.
- Verify WebXR browser compatibility.
- Verify fallback path for unsupported devices.

Exit criterion: XR routes either work on supported hardware or explicitly fall back without false claims.

## Non-blocking cleanup gaps

### 1. Historical/root duplicate cleanup

The production runtime authority is `urai-tier1`. Root-level historical or duplicate SaaS surfaces should either be deleted in a cleanup PR or clearly marked non-runtime to reduce confusion.

### 2. Drive/IP vision mapping

Drive materials define broader URAI families including AR/VR Companion Fusion, Symbolic Life Map + Avatar Fusion, Scene-Graph Compression & Replay Index, Spatial Consent Layer, Causal Insight Generator, Digital Mood Weather, Recovery Timeline, Ethics Ledger, Global Insight Exchange, Consent Tiering, and Insight Provenance.

The repo should maintain a separate product-to-runtime matrix before claiming any of those as live.

### 3. Cross-device LifeMap persistence

If LifeMap history is still partially local/fallback, add Firestore-backed persistence with owner/tenant scoping and migration tests.

### 4. Visual final-art capture

Run the app and capture screenshots/video of:

- home shell;
- orb companion route flow;
- avatar/body zoom;
- sky LifeMap;
- ground/world preview;
- mobile layout;
- reduced-motion mode.

Use captures as release evidence.

## Final done-done definition

URAI Spatial can be called done-done only when:

- release gates pass in local/CI;
- deployment succeeds;
- production smoke routes pass;
- Firebase and Stripe flows pass if enabled;
- live provider claims are restricted to verified providers;
- docs match runtime reality;
- no system contract route is stale;
- privacy, consent, fallback, and provenance claims are enforced in code and deployment.
