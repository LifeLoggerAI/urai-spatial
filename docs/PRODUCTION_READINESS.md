# URAI Spatial Production Readiness

URAI Spatial is the 3D/galaxy memory interface for URAI. This checklist locks production launch behind code, Firebase, rendering, security, and product verification.

## Verified architecture from repo

- Root monorepo uses pnpm workspaces.
- `urai-tier1` is the Next / React / React Three Fiber spatial frontend.
- `apps/functions` is the Firebase Functions package.
- `firebase.json` deploys Hosting, Firestore rules/indexes, and Functions.
- Firestore rules include admin/founder gates and deny-by-default spatial access.
- Canonical server-side Google/Firebase authentication is fail-closed against long-lived service-account JSON and requires managed ADC or protected external-account Workload Identity Federation.

## Required CI gates

- Workspace install and preflight.
- Tier 1 typecheck.
- Tier 1 tier-lock verification.
- Tier 1 tests.
- Tier 1 build.
- Functions build.
- Functions tests.
- Firebase config smoke.
- Verification lock preflight.

## Required production identity and configuration

- `URAI_SPATIAL_FIREBASE_PROJECT_ID` set to the approved production project.
- A least-privilege production Workload Identity Federation / managed ADC identity with independently verified IAM bindings and runtime read-back.
- No long-lived Firebase service-account JSON, private key, or Firebase CI token in the canonical production path.

Optional repository/environment variable:

- `URAI_SPATIAL_PRODUCTION_URL`

## Current release posture

Production mutation remains `NO-GO` while historical provider-side key revocation, production WIF/IAM trust, runtime identity read-back, rollback evidence, and final release signoffs remain unproven. Source-side WIF/ADC guards do not by themselves prove provider closure.

## Manual signoffs

Complete `verification/signoffs.md` before production deploy:

- Engineering
- Rendering / Performance
- Security / Privacy
- Domain / DNS / SSL
- Product Launch

## Rendering QA

Before launch, manually verify:

- Desktop Chrome / Safari / Edge.
- Mobile Safari / Chrome.
- GPU memory does not spike unexpectedly.
- Camera transitions are stable.
- Star selection and memory sphere interactions are deterministic.
- Tier-lock tests pass.
- Galaxy renders without WebGL context loss on target devices.

## Security QA

Before launch, verify:

- Historical user-managed Google service-account keys implicated by the credential incident have been inventoried and revoked only after dependencies are migrated and tested.
- Production identity uses least-privilege WIF/ADC and has a retained non-secret verification receipt.
- User profile access is self/admin only.
- `spatial/{doc=**}` remains admin-only unless explicitly opened with a reviewed rule.
- Feature flags are read-only to public clients and writable only by admin/founder.
- Admin/founder custom claims are assigned only to trusted URAI admins.
