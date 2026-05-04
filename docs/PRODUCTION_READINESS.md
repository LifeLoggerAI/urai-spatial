# URAI Spatial Production Readiness

URAI Spatial is the 3D/galaxy memory interface for URAI. This checklist locks production launch behind code, Firebase, rendering, security, and product verification.

## Verified architecture from repo

- Root monorepo uses pnpm workspaces.
- `urai-tier1` is the Next / React / React Three Fiber spatial frontend.
- `apps/functions` is the Firebase Functions package.
- `firebase.json` deploys Hosting, Firestore rules/indexes, and Functions.
- Firestore rules include admin/founder gates and deny-by-default spatial access.

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

## Required production secrets

- `FIREBASE_SERVICE_ACCOUNT_URAI_SPATIAL`
- `URAI_SPATIAL_FIREBASE_PROJECT_ID`

Optional repository/environment variable:

- `URAI_SPATIAL_PRODUCTION_URL`

## Manual signoffs

Complete `verification/signoffs.md` before production deploy:

- Engineering
- Rendering / Performance
- Security / Privacy
- Domain / DNS / SSL
- Product Launch

## Production deploy

Use `.github/workflows/urai-spatial-production-deploy.yml`.

Production deploy requires manual workflow input:

```text
LAUNCH-UNLOCK
```

Deploy fails if any `Status: PENDING` remains in `verification/signoffs.md`.

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

- User profile access is self/admin only.
- `spatial/{doc=**}` remains admin-only unless explicitly opened with a reviewed rule.
- Feature flags are read-only to public clients and writable only by admin/founder.
- Admin/founder custom claims are assigned only to trusted URAI admins.
